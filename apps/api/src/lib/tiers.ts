import type { LevelTier } from "@stellar-orbit/types";
import type { LevelRow } from "../db/schema.js";

export const LEVEL_TIER_ORDER: LevelTier[] = [
  "explorer",
  "stellar_pioneer",
  "orbit_builder",
  "nova_ambassador",
  "ecosystem_leader",
];

export function tierRank(tier: LevelTier, tiers: LevelTier[] = LEVEL_TIER_ORDER): number {
  return tiers.indexOf(tier);
}

/** Returns the tier label matching the highest threshold the user has reached. */
export function tierForTotalPoints(
  totalPoints: number,
  levelsDescending: LevelRow[],
): LevelTier {
  for (const row of levelsDescending) {
    if (totalPoints >= row.minPoints) {
      return row.tier;
    }
  }
  return levelsDescending.at(-1)?.tier ?? "explorer";
}

export function isHigherTier(
  candidate: LevelTier,
  baseline: LevelTier,
  allTiers?: LevelTier[],
): boolean {
  const ord = allTiers ?? LEVEL_TIER_ORDER;
  return ord.indexOf(candidate) > ord.indexOf(baseline);
}
