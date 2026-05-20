"use client";

import type { Event, EventCategory } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";

type QRResponse = { token: string; validUntil: string; eventId: string };

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

const EVENT_CATEGORIES: EventCategory[] = [
  "meetup",
  "workshop",
  "conference",
  "hackathon",
  "community_call",
  "other",
];

type EventsResponse = { events: Event[] };

export default function CountryLeadEventsPage() {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("meetup");
  const [eventDay, setEventDay] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [location, setLocation] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["country-lead", "events"],
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }
      return apiFetchWithAuth<EventsResponse>(token, "/events");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (): Promise<{ eventId: string; token: string }> => {
      const tokenStore = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!tokenStore) {
        throw new Error("Not signed in");
      }

      const startDay = startsAtLocal.slice(0, 10);
      const endDay = endsAtLocal.slice(0, 10);
      if (!eventDay.trim()) {
        throw new Error("Choose an event day.");
      }
      if (startDay !== eventDay) {
        throw new Error("Start date/time must fall on the selected event day.");
      }
      if (endDay !== eventDay) {
        throw new Error("End date/time must fall on the selected event day.");
      }
      if (startsAtLocal && endsAtLocal && endsAtLocal <= startsAtLocal) {
        throw new Error("End time must be after start time.");
      }

      const startsAt = new Date(startsAtLocal).toISOString();
      const endsAt = new Date(endsAtLocal).toISOString();

      const { event } = await apiFetchWithAuth<{ event: Event }>(tokenStore, "/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description.trim() || undefined,
          category,
          location: location.trim() || undefined,
          startsAt,
          endsAt,
        }),
      });

      const qr = await apiFetchWithAuth<QRResponse>(
        tokenStore,
        `/events/${event.id}/qr`,
      );
      return { eventId: event.id, token: qr.token };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["country-lead", "events"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setQrToken(null);
    createMutation.mutate(undefined, {
      onSuccess: ({ token }) => {
        setQrToken(token);
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          setSubmitError(err.message || "Could not create event.");
        } else if (err instanceof Error) {
          setSubmitError(err.message);
        } else {
          setSubmitError("Could not create event.");
        }
      },
    });
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  const checkInUrl =
    typeof window !== "undefined" && qrToken
      ? `${window.location.origin}/checkin?token=${encodeURIComponent(qrToken)}`
      : "";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="mt-1 text-sm text-white/50">
          Create chapter events and share check-in links with ambassadors.
        </p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">Create event</h2>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Title
            <input
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Description (optional)
            <textarea
              className="min-h-[6rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Category
            <select
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm capitalize text-white focus:outline-none focus:border-orbit-violet/50"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as EventCategory);
              }}
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Event day
            <input
              type="date"
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={eventDay}
              onChange={(event) => {
                setEventDay(event.target.value);
              }}
            />
            <span className="text-xs font-normal text-white/40">
              Start and end datetimes below must fall on this day.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Starts at
            <input
              type="datetime-local"
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={startsAtLocal}
              onChange={(event) => {
                setStartsAtLocal(event.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Ends at
            <input
              type="datetime-local"
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={endsAtLocal}
              onChange={(event) => {
                setEndsAtLocal(event.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Location (optional)
            <input
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
              }}
            />
          </label>
          {submitError ? (
            <p className="text-sm text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Publishing…" : "Create event"}
          </Button>
        </form>

        {qrToken ? (
          <div className="mt-2 rounded-md border border-orbit-success/20 bg-orbit-success/10 p-4 text-sm text-orbit-success">
            <p className="font-medium">Check-in QR token generated</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-orbit-raised p-3 font-mono text-xs ring-1 ring-orbit-success/20">
              {qrToken}
            </pre>
            {checkInUrl ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-xs">{checkInUrl}</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void copyText(checkInUrl);
                  }}
                >
                  Copy link
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">My events</h2>
        {eventsQuery.isLoading ? (
          <p className="text-sm text-white/50">Loading events…</p>
        ) : eventsQuery.isError ? (
          <p className="text-sm text-red-400">Could not load events.</p>
        ) : !eventsQuery.data?.events?.length ? (
          <p className="text-sm text-white/50">No events yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {eventsQuery.data.events.map((evt) => (
              <li
                key={evt.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-orbit-border bg-orbit-raised px-4 py-3"
              >
                <div>
                  <p className="font-medium">{evt.title}</p>
                  <p className="text-xs text-white/50">{formatDate(evt.startsAt)}</p>
                  <span className="mt-2 inline-flex rounded-full bg-orbit-raised px-2 py-0.5 text-xs font-medium capitalize text-white/60 ring-1 ring-orbit-border">
                    {categoryLabel(evt.category)}
                  </span>
                </div>
                <Link
                  href={`/cl/attendance?eventId=${encodeURIComponent(evt.id)}`}
                  className="text-sm font-semibold text-orbit-violet-light hover:underline"
                >
                  View attendance
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
