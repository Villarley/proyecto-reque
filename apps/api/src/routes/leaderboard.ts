import { Hono } from "hono";
import { z } from "zod";
import type { SQL } from "drizzle-orm";
import { desc, eq, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { LeaderboardEntry } from "@stellar-orbit/types";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { chapters, levels, pointsLedger, users } from "../db/schema.js";
import { tierForTotalPoints } from "../lib/tiers.js";

const scopeSchema = z.object({
  scope: z.enum(["chapter", "regional", "global"]),
  chapterId: z.string().uuid().optional(),
});

export const leaderboardRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .get("/", zValidator("query", scopeSchema), async (c) => {
    const session = c.get("session");
    const { scope, chapterId: chapterIdQuery } = c.req.valid("query");

    let filter: SQL | undefined;

    if (scope === "chapter") {
      const targetChapter = chapterIdQuery ?? session.chapterId;
      if (
        session.role === "ambassador" &&
        targetChapter !== session.chapterId
      ) {
        return c.json({ error: "forbidden" }, 403);
      }
      if (
        session.role === "country_lead" &&
        targetChapter !== session.chapterId
      ) {
        return c.json({ error: "forbidden" }, 403);
      }
      filter = eq(users.chapterId, targetChapter);
    } else if (scope === "regional") {
      const home = await db.query.chapters.findFirst({
        where: eq(chapters.id, session.chapterId),
      });
      if (home?.region) {
        filter = eq(chapters.region, home.region);
      } else {
        filter = eq(users.chapterId, session.chapterId);
      }
    } else {
      filter = undefined;
    }

    const levelRowsDescending = await db
      .select()
      .from(levels)
      .orderBy(desc(levels.minPoints));

    const base = db
      .select({
        userId: users.id,
        stellarPublicKey: users.stellarPublicKey,
        chapterId: users.chapterId,
        chapterName: chapters.name,
        points: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int`,
      })
      .from(users)
      .innerJoin(chapters, eq(users.chapterId, chapters.id))
      .leftJoin(pointsLedger, eq(pointsLedger.userId, users.id));

    const rows = await (filter ? base.where(filter) : base)
      .groupBy(
        users.id,
        users.stellarPublicKey,
        users.chapterId,
        chapters.name,
      )
      .orderBy(desc(sql`coalesce(sum(${pointsLedger.delta}), 0)`))
      .limit(200);

    const leaderboard: LeaderboardEntry[] = rows.map((row, idx) => ({
      rank: idx + 1,
      userId: row.userId,
      stellarPublicKey: row.stellarPublicKey,
      displayName: null,
      chapterId: row.chapterId,
      chapterName: row.chapterName,
      points: row.points,
      levelTier: tierForTotalPoints(row.points, levelRowsDescending),
    }));

    return c.json({
      leaderboard,
      note:
        "Leaderboard snapshots are refreshed daily in production; this endpoint returns live aggregates.",
    });
  });
