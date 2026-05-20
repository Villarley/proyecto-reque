import type { NotificationType } from "@stellar-orbit/types";
import type { Database } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { sendNotificationEmail } from "../lib/notifications.js";

export async function dispatchNotification(
  db: Database,
  params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    email?: string;
  },
): Promise<void> {
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
  });

  if (params.email) {
    void sendNotificationEmail({
      to: params.email,
      subject: params.title,
      text: params.body,
    }).catch((err: unknown) => {
      console.error(
        `[notification-email] dispatch failed`,
        params.userId,
        err instanceof Error ? err.message : err,
      );
    });
  }
}
