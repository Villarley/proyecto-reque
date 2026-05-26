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
import { useI18n } from "@/i18n/I18nProvider";
import { categoryLabel } from "@/i18n/categories";

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

export default function AmbassadorDashboardPage() {
  const { t } = useI18n();
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
    const idx = TIER_THRESHOLDS.findIndex((x) => x.tier === tier);
    const currentMin = TIER_THRESHOLDS[idx]?.minPoints ?? 0;
    const next = TIER_THRESHOLDS[idx + 1];
    if (!next) {
      return { currentMin, nextThreshold: null as number | null, pct: 100 };
    }
    const span = next.minPoints - currentMin;
    const pct =
      span <= 0 ? 100 : Math.min(100, Math.max(0, ((total - currentMin) / span) * 100));
    return { currentMin, nextThreshold: next.minPoints, pct };
  }, [profile.data?.totalPoints, profile.data?.currentTier]);

  if (profile.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-orbit-text-2">{t.common.loading}</p>
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-orbit-error">{t.common.error}</p>
      </div>
    );
  }

  const { user, totalPoints, currentTier, eventHistory, upcomingEvents } = profile.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-3xl bg-orbit-text text-white shadow-orbit-sm">
        <div className="flex flex-wrap items-end justify-between gap-6 px-6 py-7">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
              {user.chapter.name}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t.dashboard.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              Track your points, event activity, and progress toward the next ambassador tier.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 text-orbit-text shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
              Current level
            </p>
            <div className="mt-3">
              <LevelBadge tier={currentTier} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
            {t.dashboard.totalPoints}
          </p>
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-orbit-text">
            {totalPoints}
          </p>
        </Card>
        <Card className="flex flex-col justify-between gap-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
            {t.dashboard.currentLevel}
          </p>
          <div>
            <LevelBadge tier={currentTier} />
          </div>
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
            Events attended
          </p>
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-orbit-text">
            {eventHistory.length}
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-orbit-text">{t.dashboard.progressToNext}</p>
            <p className="mt-1 text-sm text-orbit-text-2">
              Keep attending events to move through the ambassador program.
            </p>
          </div>
          {progress.nextThreshold !== null ? (
            <p className="text-xs font-medium tabular-nums text-orbit-text-2">
              {totalPoints} / {progress.nextThreshold} pts
            </p>
          ) : (
            <p className="text-xs font-medium text-orbit-text-2">{t.dashboard.topTierReached}</p>
          )}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-orbit-raised">
          <div
            className="h-full rounded-full bg-orbit-text transition-[width] duration-500"
            style={{ width: `${String(progress.pct)}%` }}
          />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {TIER_THRESHOLDS.map((threshold) => (
            <span
              key={threshold.tier}
              className={`truncate text-[10px] font-medium capitalize ${
                threshold.tier === currentTier ? "text-orbit-text" : "text-orbit-text-3"
              }`}
            >
              {t.tiers[threshold.tier as keyof typeof t.tiers]}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-semibold text-orbit-text">{t.dashboard.upcomingEvents}</h2>
            <p className="mt-1 text-sm text-orbit-text-2">{t.dashboard.upcomingEventsHint}</p>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-orbit-border bg-orbit-raised/60 px-4 py-8 text-center">
              <p className="text-sm text-orbit-text-2">{t.dashboard.firstEventPrompt}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {upcomingEvents.map((evt) => (
                <li
                  key={evt.id}
                  className="rounded-2xl border border-orbit-border bg-orbit-raised/70 px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-orbit-text">{evt.title}</p>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold capitalize text-orbit-text-2 ring-1 ring-orbit-border">
                      {categoryLabel(evt.category, t)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-orbit-text-2">{formatDate(evt.startsAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-semibold text-orbit-text">{t.dashboard.attendanceHistory}</h2>
            <p className="mt-1 text-sm text-orbit-text-2">A record of completed check-ins.</p>
          </div>
          {eventHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-orbit-border bg-orbit-raised/60 px-4 py-8 text-center">
              <p className="text-sm text-orbit-text-2">{t.dashboard.noEventsAttended}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-orbit-border">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
                      {t.dashboard.event}
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
                      {t.dashboard.date}
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
                      {t.dashboard.points}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eventHistory.map((row) => {
                    const earned = pointsByEventId.get(row.eventId) ?? "-";
                    return (
                      <tr key={row.id} className="border-b border-orbit-border last:border-0">
                        <td className="py-3 pr-4 font-medium text-orbit-text">
                          {row.event.title}
                        </td>
                        <td className="py-3 pr-4 text-xs text-orbit-text-2">
                          {formatDate(row.checkedInAt)}
                        </td>
                        <td className="py-3 tabular-nums">
                          <span className="rounded-full bg-orbit-raised px-2.5 py-1 text-xs font-semibold text-orbit-text ring-1 ring-orbit-border">
                            +{String(earned)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
