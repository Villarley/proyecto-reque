import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { sendNotificationEmail } from "../lib/notifications.js";

const announcementSchema = z.object({
  message: z.string().min(1).max(8000),
  audience: z.enum(["all", "verified"]),
});

export const notificationsRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .post(
    "/announcement",
    requireRole(["country_lead"]),
    zValidator("json", announcementSchema),
    async (c) => {
      const session = c.get("session");
      const { message, audience } = c.req.valid("json");

      const recipientsWhere =
        audience === "verified"
          ? and(
              eq(users.chapterId, session.chapterId),
              isNotNull(users.verifiedAt),
            )
          : eq(users.chapterId, session.chapterId);

      const recipients = await db.query.users.findMany({
        columns: {
          id: true,
          email: true,
        },
        where: recipientsWhere,
      });

      const title = "Chapter announcement";

      if (recipients.length > 0) {
        await db.insert(notifications).values(
          recipients.map((r) => ({
            userId: r.id,
            type: "chapter_update" as const,
            title,
            body: message,
          })),
        );
      }

      for (const recipient of recipients) {
        if (recipient.email) {
          void sendNotificationEmail({
            to: recipient.email,
            subject: title,
            text: message,
          }).catch((err: unknown) => {
            console.error(
              "[announcement-email] failed",
              recipient.id,
              err instanceof Error ? err.message : err,
            );
          });
        }
      }

      return c.json({ sent: recipients.length }, 201);
    },
  )
  .patch("/read-all", async (c) => {
    const session = c.get("session");
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, session.sub), isNull(notifications.readAt)));
    return c.body(null, 204);
  })
  .patch("/:id/read", async (c) => {
    const session = c.get("session");
    const id = c.req.param("id");

    const existing = await db.query.notifications.findFirst({
      where: and(eq(notifications.id, id), eq(notifications.userId, session.sub)),
      columns: { id: true },
    });

    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.sub)));

    return c.body(null, 204);
  })
  .get("/", async (c) => {
    const session = c.get("session");
    const rows = await db.query.notifications.findMany({
      where: eq(notifications.userId, session.sub),
      orderBy: [desc(notifications.createdAt)],
      limit: 200,
    });
    return c.json({ notifications: rows });
  });
