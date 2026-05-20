"use client";

import type { Notification, NotificationType } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import {
  Bell,
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
    case "system":
    default:
      return Rocket;
  }
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
    return <p className="text-sm text-white/50">Loading notifications…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-400">Unable to load notifications.</p>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-white/50">
            Updates on points, levels, and chapter news.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void markAllRead();
          }}
          disabled={!sorted.some((n) => n.readAt === null)}
        >
          Mark all as read
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <p className="text-sm text-white/50">No notifications yet.</p>
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
                  className={`cursor-pointer transition hover:border-white/20 ${
                    unread ? "border-orbit-violet/40 bg-orbit-violet/10" : ""
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
                  <div className="flex gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        unread ? "bg-orbit-raised text-orbit-violet-light ring-1 ring-white/10" : "bg-orbit-raised text-white/50"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="font-semibold text-white">{n.title}</h2>
                        <span
                          className={`shrink-0 text-xs font-medium ${
                            unread ? "text-orbit-violet-light" : "text-white/40"
                          }`}
                        >
                          {unread ? "Unread" : "Read"}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-white/60">
                        {n.body}
                      </p>
                      <p className="mt-2 text-xs text-white/40">
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
