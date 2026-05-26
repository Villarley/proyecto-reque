"use client";

import type { Notification, NotificationType } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import {
  Bell,
  BadgeCheck,
  Megaphone,
  Rocket,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMessage } from "@/i18n/format";
import type { Messages } from "@/i18n/messages/en";

type NotificationsResponse = {
  notifications: Notification[];
};

function iconForType(type: NotificationType): LucideIcon {
  switch (type) {
    case "points_awarded":
      return Star;
    case "level_up":
      return Trophy;
    case "event_reminder":
      return Bell;
    case "chapter_update":
      return Megaphone;
    case "account_verified":
      return BadgeCheck;
    case "system":
    default:
      return Rocket;
  }
}

function typeLabel(type: NotificationType, t: Messages): string {
  if (type in t.notifications.typeLabels) {
    return t.notifications.typeLabels[type as keyof typeof t.notifications.typeLabels];
  }
  return t.notifications.typeLabels.system;
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AmbassadorNotificationsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useApi<NotificationsResponse>(
    ["notifications"],
    "/notifications",
  );

  const sorted = useMemo(
    () =>
      [...(data?.notifications ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data?.notifications],
  );
  const unreadCount = sorted.filter((n) => n.readAt === null).length;

  async function markAllRead() {
    const token = window.localStorage.getItem("stellar-orbit.sessionToken");
    if (!token) {
      return;
    }
    await apiFetchWithAuth(token, "/notifications/read-all", {
      method: "PATCH",
    });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markOneRead(id: string) {
    const token = window.localStorage.getItem("stellar-orbit.sessionToken");
    if (!token) {
      return;
    }
    await apiFetchWithAuth(token, `/notifications/${id}/read`, {
      method: "PATCH",
    });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  if (isLoading) {
    return <p className="text-sm text-orbit-text-2">{t.notifications.loading}</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-400">{t.notifications.loadError}</p>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-orbit-border bg-white px-6 py-6 shadow-orbit-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orbit-text-3">
            {t.notifications.inbox}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.notifications.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-orbit-text-2">
            {t.notifications.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-orbit-raised px-3 py-1.5 text-xs font-semibold text-orbit-text-2 ring-1 ring-orbit-border">
            {formatMessage(t.notifications.unread, { count: unreadCount })}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void markAllRead();
            }}
            disabled={unreadCount === 0}
          >
            {t.notifications.markAllRead}
          </Button>
        </div>
      </section>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-medium text-orbit-text">{t.notifications.empty}</p>
          <p className="mt-1 text-sm text-orbit-text-2">{t.notifications.emptyHint}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((n) => {
            const Icon = iconForType(n.type);
            const unread = n.readAt === null;
            return (
              <li key={n.id}>
                <Card
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer p-0 transition hover:border-orbit-text/25 ${
                    unread ? "border-orbit-text bg-white" : "bg-white/80"
                  }`}
                  onClick={() => {
                    if (unread) {
                      void markOneRead(n.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (unread) {
                        void markOneRead(n.id);
                      }
                    }
                  }}
                >
                  <div className="flex gap-4 p-4 sm:p-5">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                        unread
                          ? "bg-orbit-text text-white ring-orbit-text"
                          : "bg-orbit-raised text-orbit-text-2 ring-orbit-border"
                      }`}
                      title={typeLabel(n.type, t)}
                    >
                      <Icon className="h-5 w-5" aria-label={typeLabel(n.type, t)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-base font-semibold leading-tight text-orbit-text">
                          {n.title}
                        </h2>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                            unread
                              ? "bg-orbit-text text-white ring-orbit-text"
                              : "bg-orbit-raised text-orbit-text-3 ring-orbit-border"
                          }`}
                        >
                          {unread ? t.notifications.unreadBadge : t.notifications.readBadge}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-orbit-text-2">
                        {n.body}
                      </p>
                      <p className="mt-3 text-xs font-medium text-orbit-text-3">
                        {formatTimestamp(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
