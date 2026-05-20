"use client";

import type {
  Attendance,
  Chapter,
  Event,
  EventCategory,
  LevelTier,
  PointsLedgerEntry,
  User,
} from "@stellar-orbit/types";
import { Card } from "@stellar-orbit/ui";
import { useMemo } from "react";
import { LevelBadge } from "@/components/LevelBadge";
import { useApi } from "@/hooks/useApi";

type ProfileMeResponse = {
  user: User & { chapter: Chapter };
  totalPoints: number;
  currentTier: LevelTier;
  eventHistory: Array<Attendance & { event: Event }>;
  upcomingEvents: Event[];
};

type LedgerResponse = {
  ledger: PointsLedgerEntry[];
};

/** Matches default API seed (`apps/api/src/db/seed.ts`) for ambassador progress UI. */
const TIER_THRESHOLDS: { tier: LevelTier; minPoints: number }[] = [
  { tier: "explorer", minPoints: 0 },
  { tier: "stellar_pioneer", minPoints: 250 },
  { tier: "orbit_builder", minPoints: 1000 },
  { tier: "nova_ambassador", minPoints: 2500 },
  { tier: "ecosystem_leader", minPoints: 5000 },
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

export default function AmbassadorDashboardPage() {
  const profile = useApi<ProfileMeResponse>(["profile", "me"], "/profile/me");
  const ledger = useApi<LedgerResponse>(["points", "ledger"], "/points/ledger");

  const pointsByEventId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of ledger.data?.ledger ?? []) {
      if (row.reason === "event_checkin" && row.eventId) {
        map.set(row.eventId, row.delta);
      }
    }
    return map;
  }, [ledger.data?.ledger]);

  const progress = useMemo(() => {
    const total = profile.data?.totalPoints ?? 0;
    const tier = profile.data?.currentTier ?? "explorer";
    const idx = TIER_THRESHOLDS.findIndex((t) => t.tier === tier);
    const currentMin = TIER_THRESHOLDS[idx]?.minPoints ?? 0;
    const next = TIER_THRESHOLDS[idx + 1];
    if (!next) {
      return {
        currentMin,
        nextThreshold: null as number | null,
        pct: 100,
      };
    }
    const span = next.minPoints - currentMin;
    const pct =
      span <= 0 ? 100 : Math.min(100, Math.max(0, ((total - currentMin) / span) * 100));
    return { currentMin, nextThreshold: next.minPoints, pct };
  }, [profile.data?.totalPoints, profile.data?.currentTier]);

  if (profile.isLoading) {
    return <p className="text-sm text-white/50">Loading dashboard…</p>;
  }

  if (profile.isError || !profile.data) {
    return (
      <p className="text-sm text-red-400">
        Could not load your profile. Please refresh or sign in again.
      </p>
    );
  }

  const { totalPoints, currentTier, eventHistory, upcomingEvents } = profile.data;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-white/50">
          Points, level, and chapter activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-medium text-white/40">Current level</p>
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge tier={currentTier} />
          </div>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-sm font-medium text-white/40">Total points</p>
          <p className="text-4xl font-bold tabular-nums">{totalPoints}</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm font-medium text-white/70">Progress to next level</p>
          {progress.nextThreshold !== null ? (
            <p className="text-sm text-white/50">
              {totalPoints} / {progress.nextThreshold} pts
            </p>
          ) : (
            <p className="text-sm text-white/50">Top tier reached</p>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full [background:linear-gradient(135deg,#7C3AED,#4F46E5)] transition-[width]"
            style={{ width: `${String(progress.pct)}%` }}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Attendance history</h2>
        {eventHistory.length === 0 ? (
          <p className="text-sm text-white/50">No events attended yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-orbit-border text-white/40">
                  <th className="py-2 pr-4 font-medium">Event</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {eventHistory.map((row) => {
                  const earned = pointsByEventId.get(row.eventId) ?? "—";
                  return (
                    <tr key={row.id} className="border-b border-orbit-border">
                      <td className="py-2 pr-4">{row.event.title}</td>
                      <td className="py-2 pr-4 text-white/50">
                        {formatDate(row.checkedInAt)}
                      </td>
                      <td className="py-2 tabular-nums">{earned}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Upcoming events</h2>
        {upcomingEvents.length === 0 ? (
          <p className="rounded-md border border-dashed border-orbit-gold/30 bg-orbit-gold/10 px-4 py-3 text-sm text-orbit-gold">
            Attend your first event to verify your account.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcomingEvents.map((evt) => (
              <li
                key={evt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orbit-border bg-orbit-raised px-4 py-3"
              >
                <div>
                  <p className="font-medium">{evt.title}</p>
                  <p className="text-xs text-white/50">{formatDate(evt.startsAt)}</p>
                </div>
                <span className="rounded-full bg-orbit-raised px-2 py-0.5 text-xs font-medium capitalize text-white/60 ring-1 ring-white/10">
                  {categoryLabel(evt.category)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
