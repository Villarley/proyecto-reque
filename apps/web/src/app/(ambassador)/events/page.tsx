"use client";

import type { Event, EventCategory } from "@stellar-orbit/types";
import { Card } from "@stellar-orbit/ui";
import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";

type EventsResponse = {
  events: Event[];
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

function categoryLabel(c: EventCategory): string {
  return c.replaceAll("_", " ");
}

export default function AmbassadorEventsPage() {
  const { data, isLoading, isError } = useApi<EventsResponse>(
    ["events"],
    "/events",
  );
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [dateFilter, setDateFilter] = useState<"upcoming" | "all">("upcoming");

  const filtered = useMemo(() => {
    const now = Date.now();
    let rows = data?.events ?? [];
    if (dateFilter === "upcoming") {
      rows = rows.filter((e) => new Date(e.startsAt).getTime() >= now);
    }
    if (category !== "all") {
      rows = rows.filter((e) => e.category === category);
    }
    return rows;
  }, [data?.events, category, dateFilter]);

  if (isLoading) {
    return <p className="text-sm text-white/50">Loading events…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-400">
        Unable to load events. Try again later.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="mt-1 text-sm text-white/50">
          Chapter events you can join or check in to.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
          Category
          <select
            className="min-w-[11rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm font-normal text-white focus:outline-none focus:border-orbit-violet/50"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as EventCategory | "all");
            }}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : categoryLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
          Date
          <select
            className="min-w-[10rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm font-normal text-white focus:outline-none focus:border-orbit-violet/50"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as "upcoming" | "all");
            }}
          >
            <option value="upcoming">Upcoming</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-white/50">
            No events match your filters. Try showing all dates or another category.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((evt) => {
            const isVirtual = !evt.location || evt.location.trim() === "";
            return (
              <li key={evt.id}>
                <Card className="flex h-full flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold leading-snug">{evt.title}</h2>
                    <span className="shrink-0 rounded-full bg-orbit-raised px-2 py-0.5 text-xs font-medium capitalize text-white/70 ring-1 ring-white/10">
                      {categoryLabel(evt.category)}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">{formatDate(evt.startsAt)}</p>
                  <p className="text-sm text-white/60">
                    {isVirtual ? (
                      <span className="rounded-md bg-orbit-violet/10 px-2 py-0.5 text-xs font-medium text-orbit-violet-light ring-1 ring-white/10">
                        Virtual
                      </span>
                    ) : (
                      <span>{evt.location}</span>
                    )}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
