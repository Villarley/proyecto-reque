"use client";

import type { LeaderboardEntry, LeaderboardScope } from "@stellar-orbit/types";
import { Card } from "@stellar-orbit/ui";
import { useMemo, useState } from "react";
import { LevelBadge } from "@/components/LevelBadge";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/hooks/useSession";

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
  note?: string;
};

const SCOPES: LeaderboardScope[] = ["chapter", "regional", "global"];

function scopeLabel(s: LeaderboardScope): string {
  switch (s) {
    case "chapter":
      return "Chapter";
    case "regional":
      return "Regional";
    case "global":
      return "Global";
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
    return <p className="text-sm text-white/50">Loading leaderboard…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-400">
        Could not load the leaderboard.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-sm text-white/50">
          Compare ambassador progress across scopes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-orbit-border pb-2">
        {SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              scope === s
                ? "bg-orbit-violet/15 text-orbit-violet-light"
                : "bg-orbit-raised text-white/70 hover:bg-white/10"
            }`}
            onClick={() => {
              setScope(s);
            }}
          >
            {scopeLabel(s)}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-orbit-border bg-orbit-raised text-white/50">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Ambassador</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Points</th>
              <th className="px-4 py-3 font-medium">Level</th>
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
                      ? "bg-orbit-violet/15 text-orbit-violet-light ring-1 ring-inset ring-white/10"
                      : "border-b border-orbit-border"
                  }
                >
                  <td className="px-4 py-2 tabular-nums">{row.rank}</td>
                  <td className="px-4 py-2 font-medium">
                    {displayNameOrWallet(row)}
                  </td>
                  <td className="px-4 py-2 text-white/60">{row.chapterName}</td>
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
          <p className="p-6 text-sm text-white/50">No leaderboard data yet.</p>
        ) : null}
      </Card>

      <p className="text-xs text-white/40">Updated daily.</p>
    </div>
  );
}
