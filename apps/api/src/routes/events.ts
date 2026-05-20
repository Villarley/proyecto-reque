import { Hono } from "hono";
import { z } from "zod";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { env } from "../env.js";
import { db } from "../db/index.js";
import { attendance, events, pointsLedger, users } from "../db/schema.js";
import {
  assertTokenActive,
  createEventCheckInToken,
  endOfUtcDay,
  parseEventCheckInToken,
} from "../lib/qr.js";
import { autoPromoteLevel } from "../services/level-promotion.js";
import { dispatchNotification } from "../services/notification-dispatch.js";

const listQuerySchema = z.object({
  chapterId: z.string().uuid().optional(),
});

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum([
    "meetup",
    "workshop",
    "conference",
    "hackathon",
    "community_call",
    "other",
  ]),
  location: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  chapterId: z.string().uuid().optional(),
});

const patchEventSchema = createEventSchema.partial();

export const eventsRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const session = c.get("session");
    const { chapterId } = c.req.valid("query");

    if (session.role === "global_admin") {
      const rows = await db.query.events.findMany({
        orderBy: [desc(events.startsAt)],
        where: chapterId ? eq(events.chapterId, chapterId) : undefined,
      });
      return c.json({ events: rows });
    }

    if (session.role === "country_lead") {
      const rows = await db.query.events.findMany({
        where: eq(events.chapterId, session.chapterId),
        orderBy: [desc(events.startsAt)],
      });
      return c.json({ events: rows });
    }

    const rows = await db.query.events.findMany({
      where: eq(events.chapterId, session.chapterId),
      orderBy: [asc(events.startsAt)],
    });
    return c.json({ events: rows });
  })
  .post(
    "/",
    requireRole(["country_lead", "global_admin"]),
    zValidator("json", createEventSchema),
    async (c) => {
      const session = c.get("session");
      const body = c.req.valid("json");
      const targetChapterId =
        session.role === "global_admin"
          ? (body.chapterId ?? session.chapterId)
          : session.chapterId;

      if (!targetChapterId) {
        return c.json({ error: "chapter_required" }, 400);
      }

      if (session.role === "country_lead" && targetChapterId !== session.chapterId) {
        return c.json({ error: "forbidden_chapter" }, 403);
      }

      const [created] = await db
        .insert(events)
        .values({
          chapterId: targetChapterId,
          title: body.title,
          description: body.description ?? null,
          category: body.category,
          location: body.location ?? null,
          startsAt: new Date(body.startsAt),
          endsAt: new Date(body.endsAt),
          createdByUserId: session.sub,
        })
        .returning();

      if (!created) {
        return c.json({ error: "create_failed" }, 500);
      }

      return c.json({ event: created }, 201);
    },
  )
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const session = c.get("session");
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) {
      return c.json({ error: "not_found" }, 404);
    }
    if (
      session.role === "ambassador" &&
      event.chapterId !== session.chapterId
    ) {
      return c.json({ error: "forbidden" }, 403);
    }
    if (session.role === "country_lead" && event.chapterId !== session.chapterId) {
      return c.json({ error: "forbidden" }, 403);
    }
    return c.json({ event });
  })
  .patch(
    "/:id",
    requireRole(["country_lead", "global_admin"]),
    zValidator("json", patchEventSchema),
    async (c) => {
      const id = c.req.param("id");
      const session = c.get("session");
      const body = c.req.valid("json");
      const existing = await db.query.events.findFirst({ where: eq(events.id, id) });
      if (!existing) {
        return c.json({ error: "not_found" }, 404);
      }
      if (
        session.role === "country_lead" &&
        existing.chapterId !== session.chapterId
      ) {
        return c.json({ error: "forbidden" }, 403);
      }

      const targetChapterId =
        session.role === "global_admin" && body.chapterId
          ? body.chapterId
          : existing.chapterId;

      if (session.role === "country_lead" && targetChapterId !== session.chapterId) {
        return c.json({ error: "forbidden_chapter" }, 403);
      }

      const [updated] = await db
        .update(events)
        .set({
          title: body.title ?? existing.title,
          description: body.description ?? existing.description,
          category: body.category ?? existing.category,
          location: body.location ?? existing.location,
          startsAt: body.startsAt ? new Date(body.startsAt) : existing.startsAt,
          endsAt: body.endsAt ? new Date(body.endsAt) : existing.endsAt,
          chapterId: targetChapterId,
        })
        .where(eq(events.id, id))
        .returning();

      return c.json({ event: updated });
    },
  )
  .delete("/:id", requireRole(["country_lead", "global_admin"]), async (c) => {
    const id = c.req.param("id");
    const session = c.get("session");
    const existing = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }
    if (
      session.role === "country_lead" &&
      existing.chapterId !== session.chapterId
    ) {
      return c.json({ error: "forbidden" }, 403);
    }
    await db.transaction(async (tx) => {
      await tx.delete(attendance).where(eq(attendance.eventId, id));
      await tx.delete(pointsLedger).where(eq(pointsLedger.eventId, id));
      await tx.delete(events).where(eq(events.id, id));
    });
    return c.body(null, 204);
  })
  .get("/:id/attendance", requireRole(["country_lead", "global_admin"]), async (c) => {
    const id = c.req.param("id");
    const session = c.get("session");
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) {
      return c.json({ error: "not_found" }, 404);
    }
    if (session.role === "country_lead" && event.chapterId !== session.chapterId) {
      return c.json({ error: "forbidden" }, 403);
    }

    const rows = await db
      .select({
        attendanceId: attendance.id,
        userId: users.id,
        ambassadorName: users.name,
        stellarPublicKey: users.stellarPublicKey,
        verifiedAt: users.verifiedAt,
        checkedInAt: attendance.checkedInAt,
        pointsAwarded: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int`,
        checkInQrComplete: sql<boolean>`${attendance.qrTokenId} is not null`,
      })
      .from(attendance)
      .innerJoin(users, eq(users.id, attendance.userId))
      .leftJoin(
        pointsLedger,
        and(
          eq(pointsLedger.userId, attendance.userId),
          eq(pointsLedger.eventId, attendance.eventId),
          eq(pointsLedger.reason, "event_checkin"),
        ),
      )
      .where(eq(attendance.eventId, id))
      .groupBy(
        attendance.id,
        attendance.userId,
        attendance.eventId,
        attendance.checkedInAt,
        attendance.qrTokenId,
        users.id,
        users.name,
        users.stellarPublicKey,
        users.verifiedAt,
      );

    return c.json({ attendanceRows: rows });
  })
  .get("/:id/qr", requireRole(["country_lead", "global_admin"]), async (c) => {
    const id = c.req.param("id");
    const session = c.get("session");
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) {
      return c.json({ error: "not_found" }, 404);
    }
    if (
      session.role === "country_lead" &&
      event.chapterId !== session.chapterId
    ) {
      return c.json({ error: "forbidden" }, 403);
    }
    const validUntil = endOfUtcDay(new Date(event.startsAt));
    const token = createEventCheckInToken(event.id, validUntil);
    return c.json({
      token,
      validUntil: validUntil.toISOString(),
      eventId: event.id,
    });
  })
  .post(
    "/:id/checkin",
    zValidator(
      "json",
      z.object({
        token: z.string().min(1),
      }),
    ),
    async (c) => {
      const id = c.req.param("id");
      const session = c.get("session");
      const { token } = c.req.valid("json");

      const event = await db.query.events.findFirst({ where: eq(events.id, id) });
      if (!event) {
        return c.json({ error: "not_found" }, 404);
      }
      if (event.chapterId !== session.chapterId) {
        return c.json({ error: "forbidden" }, 403);
      }

      let parsed: ReturnType<typeof parseEventCheckInToken>;
      try {
        parsed = parseEventCheckInToken(token);
      } catch {
        return c.json({ error: "invalid_token" }, 400);
      }
      if (parsed.eventId !== event.id) {
        return c.json({ error: "token_event_mismatch" }, 400);
      }
      try {
        assertTokenActive(parsed.exp);
      } catch {
        return c.json({ error: "token_expired" }, 400);
      }

      const existingAttendance = await db.query.attendance.findFirst({
        where: and(eq(attendance.eventId, event.id), eq(attendance.userId, session.sub)),
      });
      if (existingAttendance) {
        return c.json({ error: "already_checked_in" }, 409);
      }

      const actorBefore = await db.query.users.findFirst({
        columns: {
          verifiedAt: true,
          email: true,
        },
        where: eq(users.id, session.sub),
      });

      if (!actorBefore) {
        return c.json({ error: "not_found" }, 404);
      }

      await db.transaction(async (tx) => {
        await tx.insert(attendance).values({
          eventId: event.id,
          userId: session.sub,
          qrTokenId: token,
        });
        await tx.insert(pointsLedger).values({
          userId: session.sub,
          delta: env.EVENT_CHECKIN_POINTS,
          reason: "event_checkin",
          eventId: event.id,
        });

        if (actorBefore.verifiedAt === null) {
          await tx
            .update(users)
            .set({ verifiedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(users.id, session.sub), isNull(users.verifiedAt)));
        }
      });

      const promote = await autoPromoteLevel(db, session.sub);

      const refreshedActor = await db.query.users.findFirst({
        columns: { email: true, name: true },
        where: eq(users.id, session.sub),
      });

      await dispatchNotification(db, {
        userId: session.sub,
        type: "system",
        title: `Checked in: ${event.title}`,
        body: `You earned ${String(env.EVENT_CHECKIN_POINTS)} points for attending.`,
        email: refreshedActor?.email ?? undefined,
      });

      if (promote.promoted && promote.newTier) {
        await dispatchNotification(db, {
          userId: session.sub,
          type: "level_up",
          title: "Level up!",
          body: `You reached tier ${promote.newTier.replaceAll("_", " ")}.`,
          email: refreshedActor?.email ?? undefined,
        });
      }

      return c.json({
        status: "checked_in",
        pointsEarned: env.EVENT_CHECKIN_POINTS,
        promoted: promote.promoted,
      });
    },
  );
