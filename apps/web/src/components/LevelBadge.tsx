"use client";

import type { LevelTier } from "@stellar-orbit/types";
import type { HTMLAttributes } from "react";
import { useI18n } from "@/i18n/I18nProvider";

const tierStyles: Record<LevelTier, string> = {
  explorer: "bg-zinc-100 text-zinc-800 ring-zinc-300",
  stellar_pioneer: "bg-slate-100 text-slate-900 ring-slate-300",
  orbit_builder: "bg-stone-100 text-stone-900 ring-stone-300",
  nova_ambassador: "bg-amber-100 text-amber-900 ring-amber-200",
  ecosystem_leader: "bg-orbit-text text-white ring-orbit-text",
};

export type LevelBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tier: LevelTier;
};

export function LevelBadge({ className = "", tier, ...props }: LevelBadgeProps) {
  const { t } = useI18n();
  const palette = tierStyles[tier];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${palette} ${className}`}
      {...props}
    >
      {t.tiers[tier as keyof typeof t.tiers]}
    </span>
  );
}
