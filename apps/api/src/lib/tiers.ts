import type { LevelTier } from "@stellar-orbit/types";
import type { LevelRow } from "../db/schema.js";

/** Canonical progression order used for validations and comparisons. */
export const LEVEL_TIER_ORDER: LevelTier[] = [
  "explorer",
  "stellar_pioneer",
  "orbit_builder",
  "nova_ambassador",
  "ecosystem_leader",
];

export function tierRank(tier: LevelTier): number {
  return LEVEL_TIER_ORDER.indexOf(tier);
}

/** `levelsDescending` ordered by minPoints descending (prefer highest threshold first). */
export function tierForTotalPoints(
  totalPoints: number,
  levelsDescending: LevelRow[],
): LevelTier {
  for (const row of levelsDescending) {
    if (totalPoints >= row.minPoints) {
      return row.tier;
    }
  }
  return "explorer";
}

/** Returns true iff `candidate` tier is strictly above `baseline`. */
export function isHigherTier(candidate: LevelTier, baseline: LevelTier): boolean {
  return tierRank(candidate) > tierRank(baseline);
}
