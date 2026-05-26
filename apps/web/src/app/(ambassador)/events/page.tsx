"use client";

import type { Event, EventCategory } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { categoryLabel } from "@/i18n/categories";

type EventsResponse = { events: Event[] };
type RegistrationsResponse = { registeredEventIds: string[] };
type AttendanceResponse = {
  checkedInEventIds: string[];
  attendance: Array<{ eventId: string; checkedInAt: string }>;
};

const CATEGORY_OPTIONS: Array<EventCategory | "all"> = [
  "all",
  "meetup",
  "workshop",
  "hackathon",
  "community_call",
  "conference",
  "other",
];

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function isUpcoming(iso: string) {
  return new Date(iso).getTime() >= Date.now();
}

function getToken() {
  return window.localStorage.getItem("stellar-orbit.sessionToken") ?? "";
}

export default function AmbassadorEventsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [dateFilter, setDateFilter] = useState<"upcoming" | "all">("upcoming");

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async () => apiFetchWithAuth<EventsResponse>(getToken(), "/events"),
  });

  const registrationsQuery = useQuery({
    queryKey: ["events", "my-registrations"],
    queryFn: async () =>
      apiFetchWithAuth<RegistrationsResponse>(getToken(), "/events/my-registrations"),
  });

  const attendanceQuery = useQuery({
    queryKey: ["events", "my-attendance"],
    queryFn: async () =>
      apiFetchWithAuth<AttendanceResponse>(getToken(), "/events/my-attendance"),
  });

  const registeredIds = useMemo(
    () => new Set(registrationsQuery.data?.registeredEventIds ?? []),
    [registrationsQuery.data],
  );
  const checkedInIds = useMemo(
    () => new Set(attendanceQuery.data?.checkedInEventIds ?? []),
    [attendanceQuery.data],
  );

  const registerMutation = useMutation({
    mutationFn: async ({ eventId, action }: { eventId: string; action: "register" | "unregister" }) => {
      if (action === "register") {
        return apiFetchWithAuth(getToken(), `/events/${eventId}/register`, { method: "POST" });
      }
      return apiFetchWithAuth(getToken(), `/events/${eventId}/register`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", "my-registrations"] });
    },
  });

  const filtered = useMemo(() => {
    let rows = eventsQuery.data?.events ?? [];
    if (dateFilter === "upcoming") rows = rows.filter((e) => isUpcoming(e.startsAt));
    if (category !== "all") rows = rows.filter((e) => e.category === category);
    return rows;
  }, [eventsQuery.data?.events, category, dateFilter]);

  if (eventsQuery.isLoading) {
    return <p className="text-sm text-orbit-text-2">{t.common.loading}</p>;
  }

  if (eventsQuery.isError) {
    return <p className="text-sm text-red-400">{t.common.error}</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-3xl border border-orbit-border bg-white px-6 py-6 shadow-orbit-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orbit-text-3">
          {t.roles.ambassador}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.events.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-orbit-text-2">
          {t.events.ambassadorSubtitle}
        </p>
      </section>

      <Card className="flex flex-wrap items-end gap-4 p-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
          {t.events.category}
          <select
            className="min-w-[12rem] rounded-xl border border-orbit-border bg-white px-3 py-2.5 text-sm font-normal text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
            value={category}
            onChange={(e) => { setCategory(e.target.value as EventCategory | "all"); }}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
          {t.events.date}
          <select
            className="min-w-[11rem] rounded-xl border border-orbit-border bg-white px-3 py-2.5 text-sm font-normal text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value as "upcoming" | "all"); }}
          >
            <option value="upcoming">{t.events.upcoming}</option>
            <option value="all">{t.events.allDates}</option>
          </select>
        </label>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-orbit-text-2">{t.events.noEvents}</p>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {filtered.map((evt) => {
            const isVirtual = !evt.location || evt.location.trim() === "";
            const isRegistered = registeredIds.has(evt.id);
            const isCheckedIn = checkedInIds.has(evt.id);
            const upcoming = isUpcoming(evt.startsAt);
            const isPending = registerMutation.isPending && registerMutation.variables.eventId === evt.id;

            return (
              <li key={evt.id}>
                <Card className="flex h-full flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold leading-tight tracking-tight">{evt.title}</h2>
                    <span className="shrink-0 rounded-full bg-orbit-raised px-2.5 py-1 text-[11px] font-semibold capitalize text-orbit-text-2 ring-1 ring-orbit-border">
                      {categoryLabel(evt.category, t)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-orbit-text-2">
                    <p>{formatDate(evt.startsAt)}</p>
                    {isVirtual ? (
                      <span className="inline-flex rounded-full bg-orbit-raised px-2.5 py-1 text-xs font-medium text-orbit-text-2 ring-1 ring-orbit-border">
                        {t.events.virtual}
                      </span>
                    ) : (
                      <p>{evt.location}</p>
                    )}
                  </div>

                  {isCheckedIn ? (
                    <div className="mt-auto pt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_10px_30px_rgba(5,150,105,0.18)]">
                        ✓ {t.events.checkedIn}
                      </span>
                    </div>
                  ) : upcoming ? (
                    <div className="mt-auto pt-2">
                      {isRegistered ? (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            ✓ {t.events.registered}
                          </span>
                          <button
                            type="button"
                            className="text-xs text-orbit-text-3 hover:text-red-400 underline underline-offset-2"
                            disabled={isPending}
                            onClick={() => {
                              registerMutation.mutate({ eventId: evt.id, action: "unregister" });
                            }}
                          >
                            {isPending ? "…" : t.events.cancel}
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          disabled={isPending || registerMutation.isPending}
                          onClick={() => {
                            registerMutation.mutate({ eventId: evt.id, action: "register" });
                          }}
                        >
                          {isPending ? t.events.registering : t.events.register}
                        </Button>
                      )}
                    </div>
                  ) : null}

                  {!upcoming && isRegistered && !isCheckedIn && (
                    <div className="mt-auto pt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orbit-raised px-2.5 py-1 text-xs font-medium text-orbit-text-3 ring-1 ring-orbit-border">
                        {t.events.registered}
                      </span>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="p-5">
        <p className="text-sm font-semibold text-orbit-text">{t.events.checkInHowTitle}</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-orbit-text-2">
          {t.events.checkInHowBody}
        </p>
      </Card>
    </div>
  );
}
