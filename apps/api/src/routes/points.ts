import { Hono } from "hono";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { pointsLedger, users } from "../db/schema.js";
import { autoPromoteLevel } from "../services/level-promotion.js";
import { dispatchNotification } from "../services/notification-dispatch.js";

const listQuerySchema = z.object({
  userId: z.string().uuid().optional(),
});

const manualPointsSchema = z.object({
  userId: z.string().uuid(),
  delta: z.number().int().positive(),
  note: z.string().min(1).max(2048),
});

export const pointsRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .get("/ledger", zValidator("query", listQuerySchema), async (c) => {
    const session = c.get("session");
    const { userId } = c.req.valid("query");

    const targetUserId =
      userId && (session.role === "global_admin" || session.role === "country_lead")
        ? userId
        : session.sub;

    if (userId && userId !== session.sub && session.role === "ambassador") {
      return c.json({ error: "forbidden" }, 403);
    }

    if (session.role === "country_lead" && userId && userId !== session.sub) {
      const scopedUserId = userId;
      const target = await db.query.users.findFirst({
        where: eq(users.id, scopedUserId),
      });
      if (!target || target.chapterId !== session.chapterId) {
        return c.json({ error: "forbidden" }, 403);
      }
    }

    const rows = await db.query.pointsLedger.findMany({
      where: eq(pointsLedger.userId, targetUserId),
      orderBy: [desc(pointsLedger.createdAt)],
      limit: 500,
    });

    return c.json({ ledger: rows });
  })
  .post(
    "/manual",
    requireRole(["country_lead", "global_admin"]),
    zValidator("json", manualPointsSchema),
    async (c) => {
      const session = c.get("session");
      const body = c.req.valid("json");

      const target = await db.query.users.findFirst({
        where: eq(users.id, body.userId),
      });
      if (!target) {
        return c.json({ error: "user_not_found" }, 404);
      }
      if (
        session.role === "country_lead" &&
        target.chapterId !== session.chapterId
      ) {
        return c.json({ error: "forbidden" }, 403);
      }

      const [entry] = await db
        .insert(pointsLedger)
        .values({
          userId: body.userId,
          delta: body.delta,
          reason: "manual_assignment",
          assignedByUserId: session.sub,
          note: body.note ?? null,
        })
        .returning();

      const promotion = await autoPromoteLevel(db, target.id);

      let awardedBody = `You received ${String(body.delta)} points.`;

      if (promotion.promoted && promotion.newTier) {
        const tierLabel = promotion.newTier.replaceAll("_", " ");
        awardedBody = `${awardedBody} You reached tier ${tierLabel}.`;
      }

      await dispatchNotification(db, {
        userId: target.id,
        type: "points_awarded",
        title: "Points update",
        body: awardedBody,
        email: target.email ?? undefined,
      });

      if (promotion.promoted && promotion.newTier) {
        const tierLabel = promotion.newTier.replaceAll("_", " ");
        await dispatchNotification(db, {
          userId: target.id,
          type: "level_up",
          title: "Level up!",
          body: `You reached tier ${tierLabel}.`,
          email: target.email ?? undefined,
        });
      }

      return c.json({ entry, promoted: promotion.promoted }, 201);
    },
  );
