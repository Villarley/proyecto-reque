import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import {
  requireAuth,
  signSessionToken,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- referenced via requireAuth; kept as explicit middleware import
  verifySessionToken,
} from "../middleware/auth.js";
import { findChapterByCountry } from "../lib/chapter-resolve.js";

const selectRoleBodySchema = z.object({
  role: z.enum(["ambassador", "country_lead", "global_admin"]),
});

const ALLOWED_ROLES_BY_MAX_ROLE: Record<
  "global_admin" | "country_lead" | "ambassador",
  readonly ("global_admin" | "country_lead" | "ambassador")[]
> = {
  global_admin: ["global_admin", "country_lead", "ambassador"],
  country_lead: ["country_lead", "ambassador"],
  ambassador: ["ambassador"],
};

const connectBodySchema = z.object({
  publicKey: z.string().min(1),
  countryCode: z
    .string()
    .length(2, "countryCode must be ISO-3166 alpha-2")
    .optional(),
  email: z.string().email().optional(),
});

export const authRoutes = new Hono()
  .post(
    "/connect",
    zValidator("json", connectBodySchema),
    async (c) => {
      const body = c.req.valid("json");

      const existing = await db.query.users.findFirst({
        where: eq(users.stellarPublicKey, body.publicKey),
      });

      let userId: string;
      let role = existing?.role ?? "ambassador";
      let chapterId = existing?.chapterId;

      if (!existing) {
        const effectiveCountry = (body.countryCode ?? "US").trim().toUpperCase();
        const directChapter = await findChapterByCountry(db, effectiveCountry);
        chapterId = directChapter?.id ?? null;
        const [created] = await db
          .insert(users)
          .values({
            stellarPublicKey: body.publicKey,
            email: body.email ?? null,
            countryCode: effectiveCountry,
            chapterId,
            role: "ambassador",
          })
          .returning({ id: users.id, role: users.role, chapterId: users.chapterId });

        if (!created) {
          return c.json({ error: "user_creation_failed" }, 500);
        }
        userId = created.id;
        role = created.role;
        chapterId = created.chapterId;
      } else {
        userId = existing.id;
        role = existing.role;
        chapterId = existing.chapterId;
        if (body.email && body.email !== existing.email) {
          await db.update(users).set({ email: body.email }).where(eq(users.id, existing.id));
        }
      }

      const token = await signSessionToken({
        sub: userId,
        stellarPublicKey: body.publicKey,
        role,
        ...(chapterId ? { chapterId } : {}),
      });

      const isNewUser = !existing;
      return c.json({ token, userId, role, chapterId: chapterId ?? null, isNewUser });
    },
  )
  .post(
    "/select-role",
    requireAuth,
    zValidator("json", selectRoleBodySchema),
    async (c) => {
      const { role: desiredRole } = c.req.valid("json");
      const session = c.get("session");

      const user = await db.query.users.findFirst({
        where: eq(users.id, session.sub),
        columns: { role: true },
      });

      if (!user) {
        return c.json({ error: "not_found" }, 404);
      }

      const maxRole = user.role;
      const allowed = ALLOWED_ROLES_BY_MAX_ROLE[maxRole];
      if (!allowed.includes(desiredRole)) {
        return c.json({ error: "role_not_allowed" }, 403);
      }

      const token = await signSessionToken({
        sub: session.sub,
        stellarPublicKey: session.stellarPublicKey,
        chapterId: session.chapterId,
        role: desiredRole,
      });

      return c.json({ token });
    },
  );
