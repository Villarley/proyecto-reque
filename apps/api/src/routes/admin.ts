import { Hono } from "hono";
import { z } from "zod";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { chapters, users } from "../db/schema.js";
import type { SQL } from "drizzle-orm";
import { chapterFromRow } from "../lib/chapter-resolve.js";

const createChapterSchema = z.object({
  name: z.string().min(1).max(200),
  countryCode: z.string().length(2),
  region: z.string().max(200).optional(),
  primaryLanguage: z.enum(["en", "es", "pt"]),
});

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["ambassador", "country_lead", "global_admin"]).optional(),
  chapterId: z.string().uuid().optional(),
});

const patchRoleBodySchema = z.object({
  role: z.enum(["ambassador", "country_lead", "global_admin"]),
});

export const adminRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth, requireRole(["global_admin"]))
  .get("/users", zValidator("query", listUsersQuerySchema), async (c) => {
    const { search, role, chapterId } = c.req.valid("query");

    const conditions: SQL[] = [];

    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (chapterId) {
      conditions.push(eq(users.chapterId, chapterId));
    }
    if (search) {
      conditions.push(
        or(
          ilike(users.stellarPublicKey, `%${search}%`),
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
        ) as SQL,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: users.id,
        stellarPublicKey: users.stellarPublicKey,
        name: users.name,
        email: users.email,
        role: users.role,
        chapterId: users.chapterId,
        chapterName: chapters.name,
        verifiedAt: users.verifiedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(chapters, eq(users.chapterId, chapters.id))
      .where(whereClause)
      .orderBy(asc(users.createdAt));

    return c.json({ users: rows, total: rows.length });
  })
  .patch(
    "/users/:userId/role",
    zValidator("json", patchRoleBodySchema),
    async (c) => {
      const userId = c.req.param("userId");
      const { role } = c.req.valid("json");

      const existing = await db.query.users.findFirst({
        columns: { id: true },
        where: eq(users.id, userId),
      });

      if (!existing) {
        return c.json({ error: "user_not_found" }, 404);
      }

      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({ id: users.id, role: users.role });

      return c.json({ user: updated });
    },
  )
  .get("/chapters", async (c) => {
    const rows = await db.query.chapters.findMany({
      orderBy: [asc(chapters.name)],
    });

    return c.json({
      chapters: rows.map((row) => ({
        id: row.id,
        name: row.name,
        countryCode: row.countryCode,
        region: row.region,
        primaryLanguage: chapterFromRow(row).primaryLanguage,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  })
  .post("/chapters", zValidator("json", createChapterSchema), async (c) => {
    const body = c.req.valid("json");
    const countryCode = body.countryCode.trim().toUpperCase();

    const existing = await db.query.chapters.findFirst({
      columns: { id: true },
      where: eq(chapters.countryCode, countryCode),
    });
    if (existing) {
      return c.json({ error: "chapter_country_exists" }, 409);
    }

    const [created] = await db
      .insert(chapters)
      .values({
        name: body.name.trim(),
        countryCode,
        region: body.region?.trim() || null,
        primaryLanguage: body.primaryLanguage,
      })
      .returning();

    if (!created) {
      return c.json({ error: "create_failed" }, 500);
    }

    return c.json({ chapter: chapterFromRow(created) }, 201);
  });
