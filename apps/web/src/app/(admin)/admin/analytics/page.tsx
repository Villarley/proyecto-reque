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
import { useI18n } from "@/i18n/I18nProvider";
import { categoryLabel } from "@/i18n/categories";

const LEVEL_ORDER: LevelTier[] = [
  "explorer",
  "stellar_pioneer",
  "orbit_builder",
  "nova_ambassador",
  "ecosystem_leader",
];

export default function AdminAnalyticsPage() {
  const { t } = useI18n();
  const [chapterId, setChapterId] = useState<string>("");
  const [exportError, setExportError] = useState<string | null>(null);

  const qs = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : "";

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", chapterId || "global"],
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error(t.validation.notSignedIn);
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
        throw new Error(t.validation.notSignedIn);
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
        setExportError(t.analytics.exportFailed);
      }
    }
  }

  if (analyticsQuery.isLoading) {
    return <p className="text-sm text-orbit-text-2">{t.common.loading}</p>;
  }

  if (analyticsQuery.isError || !a) {
    return (
      <p className="text-sm text-red-400">
        {t.analytics.loadError}
      </p>
    );
  }

  const repeatPct =
    a.repeatAttendanceRate !== null ? (a.repeatAttendanceRate * 100).toFixed(1) : "-";

  const avgAttendance =
    a.averageAttendancePerEvent !== null
      ? a.averageAttendancePerEvent.toFixed(2)
      : "-";

  const avgDaysLifecycle =
    a.avgDaysBetweenFirstAndSecondEvent !== null
      ? `${a.avgDaysBetweenFirstAndSecondEvent.toFixed(1)} ${t.analytics.daysUnit}`
      : "—";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.analytics.title}</h1>
          <p className="mt-1 text-sm text-orbit-text-2">
            {t.analytics.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-orbit-text-3">
            {t.analytics.chapterFilter}
            <select
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm font-normal normal-case text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
              }}
            >
              <option value="">{t.common.allChapters}</option>
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
            {t.common.export}
          </Button>
        </div>
      </div>
      {exportError ? (
        <p className="text-sm text-red-400" role="alert">
          {exportError}
        </p>
      ) : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-orbit-text">{t.analytics.identity}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.totalUsers}
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.totalUsers}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.verifiedAccounts}
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.verifiedUsers}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.newUsers30d}
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.newUsersLast30Days}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-orbit-text-2">
              {t.analytics.distributionByChapter}
            </p>
            <div className="mt-3 overflow-auto rounded-lg border border-orbit-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-orbit-raised text-xs uppercase text-orbit-text-3">
                  <tr className="border-b border-orbit-border">
                    <th className="px-3 py-2">{t.analytics.chapter}</th>
                    <th className="px-3 py-2">{t.analytics.users}</th>
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
            <p className="text-sm font-medium text-orbit-text-2">
              {t.analytics.distributionByLevel}
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
        <h2 className="text-lg font-semibold text-orbit-text">{t.analytics.activity}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.totalEvents}
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.totalEvents}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.avgAttendance}
            </p>
            <p className="text-3xl font-bold tabular-nums">{avgAttendance}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.checkIns30d}
            </p>
            <p className="text-3xl font-bold tabular-nums">{a.checkinsLast30Days}</p>
          </div>
        </div>
        <div className="mt-8">
          <p className="text-sm font-medium text-orbit-text-2">{t.analytics.popularCategories}</p>
          {sortedCategories.length === 0 ? (
            <p className="mt-2 text-sm text-orbit-text-2">{t.common.noData}</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {sortedCategories.map((row) => (
                <li
                  key={row.category}
                  className="rounded-full bg-orbit-violet/10 px-4 py-1 text-xs font-semibold capitalize text-orbit-violet-light ring-1 ring-orbit-violet/20"
                >
                  {categoryLabel(row.category, t)} ({row.count})
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-orbit-text">{t.analytics.engagement}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.repeatRate}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{repeatPct}%</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-orbit-text-3">
              {t.analytics.avgDaysFirstToSecond}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{avgDaysLifecycle}</p>
          </div>
        </div>
        <div className="mt-8 overflow-auto">
          <p className="text-sm font-medium text-orbit-text-2">
            {t.analytics.chapterComparison} ({a.engagementByChapter.length})
          </p>
          <table className="mt-3 w-full min-w-[760px] text-left text-xs">
            <thead className="bg-orbit-raised text-[11px] font-semibold uppercase text-orbit-text-3">
              <tr className="border-b border-orbit-border">
                <th className="py-2 pr-3">{t.analytics.chapter}</th>
                <th className="py-2 pr-3">{t.analytics.ambassadors}</th>
                <th className="py-2 pr-3">{t.analytics.eventsHeld}</th>
                <th className="py-2 pr-3">{t.analytics.avgAttendPerEvt}</th>
                <th className="py-2 pr-3">{t.analytics.active30d}</th>
                <th className="py-2 pr-3">{t.analytics.checkIns30dShort}</th>
                <th className="py-2">{t.analytics.totalCI}</th>
              </tr>
            </thead>
            <tbody>
              {a.engagementByChapter.map((row) => (
                <tr key={row.chapterId} className="border-b border-orbit-border">
                  <td className="py-2 pr-3 font-medium text-orbit-text">{row.chapterName}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.ambassadorCount}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.eventsHeld}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {row.averageAttendancePerEvent !== null
                      ? row.averageAttendancePerEvent.toFixed(2)
                      : "-"}
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
        <p className="font-semibold uppercase tracking-wide">{t.analytics.liveSnapshot}</p>
        <p className="mt-2">
          {t.analytics.generatedAt}{" "}
          {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(a.generatedAt))}
        </p>
      </Card>
    </div>
  );
}
