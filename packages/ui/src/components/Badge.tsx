import type { HTMLAttributes } from "react";
import type { LevelTier } from "@stellar-orbit/types";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tier: LevelTier;
};

const tierStyles: Record<LevelTier, string> = {
  explorer:
    "bg-[rgba(29,184,198,0.1)] text-[#1DB8C6] border border-[rgba(29,184,198,0.25)]",
  stellar_pioneer:
    "bg-[rgba(139,92,246,0.12)] text-orbit-violet-light border border-[rgba(139,92,246,0.3)]",
  orbit_builder:
    "bg-[rgba(79,70,229,0.12)] text-[#818CF8] border border-[rgba(79,70,229,0.3)]",
  nova_ambassador:
    "bg-[rgba(245,158,11,0.12)] text-orbit-gold border border-[rgba(245,158,11,0.3)]",
  ecosystem_leader:
    "[background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(245,158,11,0.15))] text-orbit-gold-light border border-[rgba(245,158,11,0.4)]",
};

const tierLabels: Record<LevelTier, string> = {
  explorer: "Explorer",
  stellar_pioneer: "Stellar Pioneer",
  orbit_builder: "Orbit Builder",
  nova_ambassador: "Nova Ambassador",
  ecosystem_leader: "Ecosystem Leader",
};

export function Badge({ className = "", tier, ...props }: BadgeProps) {
  const palette = tierStyles[tier];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${palette} ${className}`}
      {...props}
    >
      {tierLabels[tier]}
    </span>
  );
}
