import { Hono } from "hono";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { LevelTier } from "@stellar-orbit/types";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { levels } from "../db/schema.js";
import { LEVEL_TIER_ORDER } from "../lib/tiers.js";

const levelTierTuple = [
  LEVEL_TIER_ORDER[0],
  ...LEVEL_TIER_ORDER.slice(1),
] as unknown as readonly [LevelTier, ...LevelTier[]];

const levelPutSchema = z
  .array(
    z.object({
      tier: z.enum(levelTierTuple),
      minPoints: z.number().int(),
      displayName: z.string().min(1).max(200),
    }),
  )
  .length(5);

export const levelsRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .use("*", requireRole(["global_admin"]))
  .get("/", async (c) => {
    const rows = await db.query.levels.findMany({
      orderBy: [asc(levels.sortOrder)],
    });
    return c.json({ levels: rows });
  })
  .put("/", zValidator("json", levelPutSchema), async (c) => {
    const body = c.req.valid("json");

    const tierSet = new Set(body.map((row) => row.tier));
    for (const tier of LEVEL_TIER_ORDER) {
      if (!tierSet.has(tier)) {
        return c.json({ error: "missing_tier", tier }, 400);
      }
    }

    const sortedRows: Array<(typeof body)[number]> = [];

    for (const tier of LEVEL_TIER_ORDER) {
      const row = body.find((r) => r.tier === tier);
      if (!row) {
        return c.json({ error: "missing_tier", tier }, 400);
      }
      sortedRows.push(row);
    }

    let previous = -Infinity;
    for (const row of sortedRows) {
      if (row.minPoints <= previous) {
        return c.json({ error: "min_points_must_strictly_increase_by_tier" }, 400);
      }
      previous = row.minPoints;
    }

    await db.transaction(async (tx) => {
      for (const [idx, row] of sortedRows.entries()) {
        await tx
          .insert(levels)
          .values({
            tier: row.tier,
            displayName: row.displayName,
            minPoints: row.minPoints,
            maxPoints: null,
            sortOrder: idx + 1,
          })
          .onConflictDoUpdate({
            target: levels.tier,
            set: {
              displayName: row.displayName,
              minPoints: row.minPoints,
              sortOrder: idx + 1,
            },
          });
      }
    });

    const updated = await db.query.levels.findMany({
      orderBy: [asc(levels.sortOrder)],
    });

    return c.json({ levels: updated });
  });
