import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { levels } from "../db/schema.js";

const levelPutSchema = z
  .array(
    z.object({
      tier: z.string().min(1).max(100),
      minPoints: z.number().int().min(0),
      displayName: z.string().min(1).max(200),
    }),
  )
  .min(1)
  .superRefine((arr, ctx) => {
    const tiers = arr.map((r) => r.tier);
    const unique = new Set(tiers);
    if (unique.size !== tiers.length) {
      ctx.addIssue({ code: "custom", message: "Tier keys must be unique." });
    }
  });

const levelPostSchema = z.object({
  tier: z.string().min(1).max(100),
  minPoints: z.number().int().min(0),
  displayName: z.string().min(1).max(200),
});

export const levelsRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .use("*", requireRole(["global_admin"]))
  .get("/", async (c) => {
    const rows = await db.query.levels.findMany({
      orderBy: [asc(levels.sortOrder)],
    });
    return c.json({ levels: rows });
  })
  .post("/", zValidator("json", levelPostSchema), async (c) => {
    const body = c.req.valid("json");

    const existing = await db.query.levels.findFirst({
      where: eq(levels.tier, body.tier),
    });
    if (existing) {
      return c.json({ error: "tier_already_exists" }, 409);
    }

    const allRows = await db.query.levels.findMany({ orderBy: [asc(levels.sortOrder)] });
    const nextSort = (allRows.at(-1)?.sortOrder ?? 0) + 1;

    const [created] = await db
      .insert(levels)
      .values({
        tier: body.tier,
        displayName: body.displayName,
        minPoints: body.minPoints,
        maxPoints: null,
        sortOrder: nextSort,
      })
      .returning();

    const updated = await db.query.levels.findMany({ orderBy: [asc(levels.sortOrder)] });
    return c.json({ level: created, levels: updated }, 201);
  })
  .put("/", zValidator("json", levelPutSchema), async (c) => {
    const body = c.req.valid("json");

    const sorted = [...body].sort((a, b) => a.minPoints - b.minPoints);

    await db.transaction(async (tx) => {
      // Remove levels not in the new list
      const allExisting = await tx.query.levels.findMany();
      const newTiers = new Set(body.map((r) => r.tier));
      for (const row of allExisting) {
        if (!newTiers.has(row.tier)) {
          await tx.delete(levels).where(eq(levels.tier, row.tier));
        }
      }

      for (const [idx, row] of sorted.entries()) {
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

    const updated = await db.query.levels.findMany({ orderBy: [asc(levels.sortOrder)] });
    return c.json({ levels: updated });
  })
  .delete("/:tier", async (c) => {
    const tier = c.req.param("tier");

    const allRows = await db.query.levels.findMany({ orderBy: [asc(levels.sortOrder)] });
    if (allRows.length <= 1) {
      return c.json({ error: "cannot_delete_last_level" }, 400);
    }

    const existing = allRows.find((r) => r.tier === tier);
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }

    await db.delete(levels).where(eq(levels.tier, tier));

    const updated = await db.query.levels.findMany({ orderBy: [asc(levels.sortOrder)] });
    return c.json({ levels: updated });
  });
