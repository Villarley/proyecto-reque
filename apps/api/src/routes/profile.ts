import { Hono } from "hono";
import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, ne, or, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { attendance, chapters, events, levels, pointsLedger, users } from "../db/schema.js";
import {
  isChapterIdAllowed,
  resolveChapterForUser,
} from "../lib/chapter-resolve.js";
import { profileLanguageForUser } from "../lib/notification-copy.js";
import { tierForTotalPoints } from "../lib/tiers.js";

const chapterMembersQuerySchema = z.object({
  chapterId: z.string().uuid().optional(),
});

const patchProfileSchema = z
  .object({
    name: z.string().min(1).max(200).nullable().optional(),
    email: z.string().email().optional(),
    countryCode: z.string().length(2).toUpperCase().optional(),
    language: z.enum(["en", "es", "pt"]).optional(),
    chapterId: z.string().uuid().optional(),
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

    const upcomingEvents = userRow.chapterId
      ? await db.query.events.findMany({
          where: and(
            eq(events.chapterId, userRow.chapterId),
            gte(events.startsAt, new Date()),
          ),
          orderBy: [asc(events.startsAt)],
          limit: 5,
        })
      : [];

    const { attendance: attendanceHistory, chapter, ...rest } = userRow;
    const chapterAssignmentStatus = userRow.chapterId ? "assigned" : "needs_selection";

    return c.json({
      user: { ...rest, chapter },
      totalPoints,
      currentTier,
      eventHistory: attendanceHistory,
      upcomingEvents,
      chapterAssignmentStatus,
      profileComplete: !!(rest.name && rest.email && userRow.chapterId),
    });
  })
  .get(
    "/chapter/members",
    requireRole(["country_lead", "global_admin"]),
    zValidator("query", chapterMembersQuerySchema),
    async (c) => {
      const session = c.get("session");
      if (!session.chapterId) {
        return c.json({ error: "chapter_required" }, 403);
      }

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
  .get(
    "/users/search",
    requireRole(["country_lead", "global_admin"]),
    zValidator("query", z.object({ q: z.string().optional() })),
    async (c) => {
      const { q } = c.req.valid("query");
      const needle = q?.trim();

      const whereClause =
        needle
          ? or(
              ilike(users.stellarPublicKey, `%${needle}%`),
              ilike(users.name, `%${needle}%`),
              ilike(users.email, `%${needle}%`),
            )
          : undefined;

      const rows = await db
        .select({
          id: users.id,
          stellarPublicKey: users.stellarPublicKey,
          name: users.name,
          email: users.email,
          verifiedAt: users.verifiedAt,
          chapterId: users.chapterId,
          chapterName: chapters.name,
        })
        .from(users)
        .leftJoin(chapters, eq(users.chapterId, chapters.id))
        .where(whereClause)
        .orderBy(asc(users.name))
        .limit(100);

      return c.json({ users: rows });
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

    const current = await db.query.users.findFirst({
      where: eq(users.id, session.sub),
    });
    if (!current) {
      return c.json({ error: "not_found" }, 404);
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

    const nextCountryCode = body.countryCode ?? current.countryCode;
    const nextLanguage =
      body.language ?? profileLanguageForUser(current);

    if (body.countryCode) {
      patch.countryCode = body.countryCode.toUpperCase();
    }

    const countryOrLanguageChanged = Boolean(body.countryCode || body.language);

    if (countryOrLanguageChanged || body.chapterId !== undefined) {
      const resolution = await resolveChapterForUser(db, {
        countryCode: nextCountryCode,
        language: nextLanguage,
      });

      if (resolution.match === "direct") {
        patch.chapterId = resolution.chapter.id;
      } else if (body.chapterId !== undefined) {
        if (!isChapterIdAllowed(body.chapterId, resolution)) {
          return c.json({ error: "invalid_chapter" }, 400);
        }
        patch.chapterId = body.chapterId;
      } else if (countryOrLanguageChanged) {
        patch.chapterId = null;
      }
    }

    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, session.sub))
      .returning();

    if (!updated) {
      return c.json({ error: "not_found" }, 404);
    }

    const chapterAssignmentStatus = updated.chapterId ? "assigned" : "needs_selection";

    return c.json({
      user: updated,
      chapterAssignmentStatus,
      profileComplete: !!(updated.name && updated.email && updated.chapterId),
    });
  });
