import { Hono } from "hono";
import { z } from "zod";
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { attendance, chapters, events, levels, pointsLedger, users } from "../db/schema.js";
import { tierForTotalPoints } from "../lib/tiers.js";

const chapterMembersQuerySchema = z.object({
  chapterId: z.string().uuid().optional(),
});

const patchProfileSchema = z
  .object({
    name: z.string().min(1).max(200).nullable().optional(),
    email: z.string().email().nullable().optional(),
    language: z.string().min(2).max(32).nullable().optional(),
  })
  .strict();

export const profileRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .get("/me", async (c) => {
    const session = c.get("session");

    const userRow = await db.query.users.findFirst({
      where: eq(users.id, session.sub),
      with: {
        chapter: true,
        attendance: {
          orderBy: [desc(attendance.checkedInAt)],
          limit: 20,
          with: { event: true },
        },
      },
    });

    if (!userRow) {
      return c.json({ error: "not_found" }, 404);
    }

    const [pointsRow] = await db
      .select({
        total: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int`,
      })
      .from(pointsLedger)
      .where(eq(pointsLedger.userId, session.sub));

    const totalPoints = pointsRow?.total ?? 0;

    const levelRows = await db
      .select()
      .from(levels)
      .orderBy(desc(levels.minPoints));

    const currentTier = tierForTotalPoints(totalPoints, levelRows);

    const upcomingEvents = await db.query.events.findMany({
      where: and(
        eq(events.chapterId, userRow.chapterId),
        gte(events.startsAt, new Date()),
      ),
      orderBy: [asc(events.startsAt)],
      limit: 5,
    });

    const { attendance: attendanceHistory, chapter, ...rest } = userRow;

    return c.json({
      user: { ...rest, chapter },
      totalPoints,
      currentTier,
      eventHistory: attendanceHistory,
      upcomingEvents,
    });
  })
  .get(
    "/chapter/members",
    requireRole(["country_lead", "global_admin"]),
    zValidator("query", chapterMembersQuerySchema),
    async (c) => {
      const session = c.get("session");
      const query = c.req.valid("query");
      const targetChapterId =
        session.role === "global_admin" && query.chapterId
          ? query.chapterId
          : session.chapterId;

      const chapterRow = await db.query.chapters.findFirst({
        columns: { id: true, name: true },
        where: eq(chapters.id, targetChapterId),
      });
      if (!chapterRow) {
        return c.json({ error: "chapter_not_found" }, 404);
      }

      const members = await db.query.users.findMany({
        columns: {
          id: true,
          stellarPublicKey: true,
          name: true,
          verifiedAt: true,
        },
        where: and(
          eq(users.chapterId, targetChapterId),
          eq(users.role, "ambassador"),
        ),
        orderBy: [asc(users.stellarPublicKey)],
      });

      return c.json({
        chapterId: chapterRow.id,
        chapterName: chapterRow.name,
        members,
      });
    },
  )
  .patch("/me", zValidator("json", patchProfileSchema), async (c) => {
    const session = c.get("session");
    const body = c.req.valid("json");

    if (typeof body.email === "string") {
      const emailTaken = await db.query.users.findFirst({
        columns: { id: true },
        where: and(eq(users.email, body.email), ne(users.id, session.sub)),
      });
      if (emailTaken) {
        return c.json({ error: "email_taken" }, 409);
      }
    }

    const patch: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      patch.name = body.name;
    }

    if (body.email !== undefined) {
      patch.email = body.email;
    }

    if (body.language !== undefined) {
      patch.language = body.language;
    }

    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, session.sub))
      .returning();

    if (!updated) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.json({ user: updated });
  });
