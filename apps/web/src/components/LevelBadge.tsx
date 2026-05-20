"use client";

import type { LevelTier } from "@stellar-orbit/types";
import type { HTMLAttributes } from "react";

const tierStyles: Record<LevelTier, string> = {
  explorer: "bg-zinc-100 text-zinc-800 ring-zinc-300",
  stellar_pioneer: "bg-blue-100 text-blue-900 ring-blue-200",
  orbit_builder: "bg-purple-100 text-purple-900 ring-purple-200",
  nova_ambassador: "bg-orange-100 text-orange-900 ring-orange-200",
  ecosystem_leader: "bg-yellow-100 text-yellow-900 ring-yellow-200",
};

const tierLabels: Record<LevelTier, string> = {
  explorer: "Explorer",
  stellar_pioneer: "Stellar Pioneer",
  orbit_builder: "Orbit Builder",
  nova_ambassador: "Nova Ambassador",
  ecosystem_leader: "Ecosystem Leader",
};

export type LevelBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tier: LevelTier;
};

export function LevelBadge({ className = "", tier, ...props }: LevelBadgeProps) {
  const palette = tierStyles[tier];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${palette} ${className}`}
      {...props}
    >
      {tierLabels[tier]}
    </span>
  );
}
