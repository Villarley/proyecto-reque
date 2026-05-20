"use client";

import type {
  AnalyticsDashboard,
  EventCategory,
  LevelTier,
} from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LevelBadge } from "@/components/LevelBadge";
import { ApiError, apiFetchWithAuth, authorizedFetchCsv } from "@/lib/api";

const LEVEL_ORDER: LevelTier[] = [
  "explorer",
  "stellar_pioneer",
  "orbit_builder",
  "nova_ambassador",
  "ecosystem_leader",
];

function categoryLabel(c: EventCategory): string {
  return c.replaceAll("_", " ");
}

export default function AdminAnalyticsPage() {
  const [chapterId, setChapterId] = useState<string>("");
  const [exportError, setExportError] = useState<string | null>(null);

  const qs = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : "";

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", chapterId || "global"],
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }
      return apiFetchWithAuth<{ analytics: AnalyticsDashboard }>(
        token,
        `/analytics${qs}`,
      );
    },
  });

  const a = analyticsQuery.data?.analytics;

  const sortedCategories = useMemo(() => {
    const cats = [...(a?.eventsByCategory ?? [])];
    cats.sort((x, y) => y.count - x.count);
    return cats;
  }, [a?.eventsByCategory]);

  async function onExport(): Promise<void> {
    setExportError(null);
    try {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }
      const path = `/analytics/export${qs}`;
      const res = await authorizedFetchCsv(token, path);
      if (!res.ok) {
        const txt = await res.text();
        throw new ApiError(txt || res.statusText, res.status);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `stellar-orbit-analytics-${
        new Date().toISOString().slice(0, 10)
      }.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError) {
        setExportError(err.message);
      } else if (err instanceof Error) {
        setExportError(err.message);
      } else {
        setExportError("CSV export failed.");
      }
    }
  }

  if (analyticsQuery.isLoading) {
    return <p className="text-sm text-white/50">Loading analytics…</p>;
  }

  if (analyticsQuery.isError || !a) {
    return (
      <p className="text-sm text-red-400">
        Could not load analytics. Confirm you&apos;re authenticated as global admin.
      </p>
    );
  }

  const repeatPct =
    a.repeatAttendanceRate !== null ? (a.repeatAttendanceRate * 100).toFixed(1) : "—";

  const avgAttendance =
    a.averageAttendancePerEvent !== null
      ? a.averageAttendancePerEvent.toFixed(2)
      : "—";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-white/50">
            Identity, activity, and engagement signals across Stellar Orbit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-white/40">
            Chapter filter
            <select
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm font-normal normal-case text-white focus:outline-none focus:border-orbit-violet/50"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
              }}
            >
              <option value="">All chapters</option>
              {a.chapterOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={analyticsQuery.isFetching}
            onClick={() => {
              void onExport();
            }}
          >
            Export CSV
          </Button>
        </div>
      </div>
      {exportError ? (
        <p className="text-sm text-red-400" role="alert">
          {exportError}
        </p>
      ) : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Identity</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-white/40">
              Total users
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.totalUsers}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-white/40">
              Verified accounts
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.verifiedUsers}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-white/40">
              New users (30d)
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.newUsersLast30Days}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-white/70">
              Distribution by chapter
            </p>
            <div className="mt-3 overflow-auto rounded-lg border border-orbit-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-orbit-raised text-xs uppercase text-white/40">
                  <tr className="border-b border-orbit-border">
                    <th className="px-3 py-2">Chapter</th>
                    <th className="px-3 py-2">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {(a.chapterUserCounts ?? []).map((row) => (
                    <tr key={row.chapterId} className="border-b border-orbit-border">
                      <td className="px-3 py-2">{row.chapterName}</td>
                      <td className="px-3 py-2 tabular-nums">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">
              Distribution by computed level
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {LEVEL_ORDER.map((tier) => (
                <li
                  key={tier}
                  className="flex items-center justify-between gap-4 rounded-lg border border-orbit-border px-4 py-2"
                >
                  <LevelBadge tier={tier} />
                  <span className="text-lg font-bold tabular-nums">
                    {a.levelDistributionByComputedTier[tier] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Activity</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-white/40">
              Total events
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.totalEvents}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-white/40">
              Avg. attendance per event
            </p>
            <p className="text-3xl font-bold tabular-nums">{avgAttendance}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-white/40">
              Check-ins (30d scope)
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.checkinsLast30Days}</p>
          </div>
        </div>
        <div className="mt-8">
          <p className="text-sm font-medium text-white/70">Popular categories</p>
          {sortedCategories.length === 0 ? (
            <p className="mt-2 text-sm text-white/50">No event data.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {sortedCategories.map((row) => (
                <li
                  key={row.category}
                  className="rounded-full bg-orbit-violet/10 px-4 py-1 text-xs font-semibold capitalize text-orbit-violet-light ring-1 ring-orbit-violet/20"
                >
                  {categoryLabel(row.category)} ({row.count})
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Engagement</h2>
        <div className="mt-3">
          <p className="text-sm text-white/60">
            Repeat attendee rate shares how many ambassadors with at least one check-in attended
            more than one qualifying event (&gt;=
            {" "}
            2 check-ins recorded).
          </p>
          <p className="mt-4 text-sm font-semibold text-white">
            Repeat rate:&nbsp;<span className="tabular-nums">{repeatPct}%</span>
          </p>
        </div>
        <div className="mt-8 overflow-auto">
          <p className="text-sm font-medium text-white/70">
            Chapter comparison ({a.engagementByChapter.length})
          </p>
          <table className="mt-3 w-full min-w-[760px] text-left text-xs">
            <thead className="bg-orbit-raised text-[11px] font-semibold uppercase text-white/40">
              <tr className="border-b border-orbit-border">
                <th className="py-2 pr-3">Chapter</th>
                <th className="py-2 pr-3">Ambassadors</th>
                <th className="py-2 pr-3">Events held</th>
                <th className="py-2 pr-3">Avg attend / evt</th>
                <th className="py-2 pr-3">Active (30d)</th>
                <th className="py-2 pr-3">Check-ins (30d)</th>
                <th className="py-2">Total CI</th>
              </tr>
            </thead>
            <tbody>
              {a.engagementByChapter.map((row) => (
                <tr key={row.chapterId} className="border-b border-orbit-border">
                  <td className="py-2 pr-3 font-medium text-white">{row.chapterName}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.ambassadorCount}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.eventsHeld}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {row.averageAttendancePerEvent !== null
                      ? row.averageAttendancePerEvent.toFixed(2)
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{row.activeAmbassadorsLast30Days}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.checkInsLast30Days}</td>
                  <td className="py-2 tabular-nums">{row.totalCheckIns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-dashed border-orbit-gold/30 bg-orbit-gold/10 p-4 text-xs text-orbit-gold">
        <p className="font-semibold uppercase tracking-wide">
          Derived from live data snapshot
        </p>
        <p className="mt-2">
          Generated at {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(a.generatedAt))}
        </p>
      </Card>
    </div>
  );
}
