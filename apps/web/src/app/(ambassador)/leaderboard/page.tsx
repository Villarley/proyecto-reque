"use client";

import type { LeaderboardEntry, LeaderboardScope } from "@stellar-orbit/types";
import { Card } from "@stellar-orbit/ui";
import { useMemo, useState } from "react";
import { LevelBadge } from "@/components/LevelBadge";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/hooks/useSession";
import { useI18n } from "@/i18n/I18nProvider";

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
  note?: string;
};

const SCOPES: LeaderboardScope[] = ["chapter", "regional", "global"];

function scopeLabel(s: LeaderboardScope, t: ReturnType<typeof useI18n>["t"]): string {
  switch (s) {
    case "chapter":
      return t.leaderboard.chapter;
    case "regional":
      return t.leaderboard.regional;
    case "global":
      return t.leaderboard.global;
    default:
      return s;
  }
}

function truncateMiddle(value: string, left = 6, right = 4): string {
  if (value.length <= left + right) {
    return value;
  }
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function displayNameOrWallet(entry: LeaderboardEntry): string {
  if (entry.displayName?.trim()) {
    return entry.displayName.trim();
  }
  return truncateMiddle(entry.stellarPublicKey);
}

export default function AmbassadorLeaderboardPage() {
  const { t } = useI18n();
  const session = useSession();
  const [scope, setScope] = useState<LeaderboardScope>("chapter");

  const path = `/leaderboard?scope=${encodeURIComponent(scope)}`;
  const { data, isLoading, isError } = useApi<LeaderboardResponse>(
    ["leaderboard", scope],
    path,
    { enabled: session !== undefined && session !== null },
  );

  const rows = useMemo(() => data?.leaderboard ?? [], [data?.leaderboard]);

  if (isLoading) {
    return <p className="text-sm text-orbit-text-2">{t.common.loading}</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-400">{t.common.error}</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t.leaderboard.title}</h1>
        <p className="mt-1 text-sm text-orbit-text-2">{t.leaderboard.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-orbit-border pb-2">
        {SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              scope === s
                ? "bg-orbit-violet/15 text-orbit-violet-light"
                : "bg-orbit-raised text-orbit-text-2 hover:bg-orbit-raised"
            }`}
            onClick={() => {
              setScope(s);
            }}
          >
            {scopeLabel(s, t)}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-orbit-border bg-orbit-raised text-orbit-text-2">
              <th className="px-4 py-3 font-medium">{t.leaderboard.rank}</th>
              <th className="px-4 py-3 font-medium">{t.leaderboard.ambassador}</th>
              <th className="px-4 py-3 font-medium">{t.leaderboard.chapter}</th>
              <th className="px-4 py-3 font-medium">{t.leaderboard.points}</th>
              <th className="px-4 py-3 font-medium">{t.leaderboard.level}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelf = session && row.userId === session.userId;
              return (
                <tr
                  key={row.userId}
                  className={
                    isSelf
                      ? "bg-orbit-violet/15 text-orbit-violet-light ring-1 ring-inset ring-orbit-border"
                      : "border-b border-orbit-border"
                  }
                >
                  <td className="px-4 py-2 tabular-nums">{row.rank}</td>
                  <td className="px-4 py-2 font-medium">
                    {displayNameOrWallet(row)}
                  </td>
                  <td className="px-4 py-2 text-orbit-text-2">{row.chapterName}</td>
                  <td className="px-4 py-2 tabular-nums">{row.points}</td>
                  <td className="px-4 py-2">
                    <LevelBadge tier={row.levelTier} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-orbit-text-2">{t.leaderboard.noData}</p>
        ) : null}
      </Card>

      <p className="text-xs text-orbit-text-3">{t.leaderboard.updatedDaily}</p>
    </div>
  );
}
