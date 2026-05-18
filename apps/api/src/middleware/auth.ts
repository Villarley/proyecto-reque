import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import type { Role } from "@stellar-orbit/types";
import { env } from "../env.js";
import { z } from "zod";

const claimsSchema = z.object({
  sub: z.string().uuid(),
  stellarPublicKey: z.string().min(1),
  role: z.enum(["ambassador", "country_lead", "global_admin"]),
  chapterId: z.string().uuid(),
});

export type SessionClaims = z.infer<typeof claimsSchema>;

export type AppVariables = {
  session: SessionClaims;
};

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new SignJWT({
    stellarPublicKey: claims.stellarPublicKey,
    role: claims.role,
    chapterId: claims.chapterId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const parsed = claimsSchema.safeParse({
    sub: payload.sub,
    stellarPublicKey: payload["stellarPublicKey"],
    role: payload["role"],
    chapterId: payload["chapterId"],
  });
  if (!parsed.success) {
    throw new Error("Invalid session token claims");
  }
  return parsed.data;
}

export const requireAuth = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const header = c.req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "missing_bearer_token" }, 401);
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      const session = await verifySessionToken(token);
      c.set("session", session);
      await next();
    } catch {
      return c.json({ error: "invalid_token" }, 401);
    }
  },
);

export function requireRole(roles: Role[]) {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const session = c.get("session");
    if (!roles.includes(session.role)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  });
}
