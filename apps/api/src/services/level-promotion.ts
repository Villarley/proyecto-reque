import { desc, eq, sql } from "drizzle-orm";
import type { LevelTier } from "@stellar-orbit/types";
import type { Database } from "../db/index.js";
import { levels, pointsLedger, users } from "../db/schema.js";
import { isHigherTier, tierForTotalPoints } from "../lib/tiers.js";

export async function autoPromoteLevel(
  db: Database,
  userId: string,
): Promise<{ promoted: boolean; newTier?: LevelTier }> {
  const [sumRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int`,
    })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));

  const totalPoints = sumRow?.total ?? 0;

  const levelRows = await db
    .select()
    .from(levels)
    .orderBy(desc(levels.minPoints));

  const nextTier = tierForTotalPoints(totalPoints, levelRows);

  const user = await db.query.users.findFirst({
    columns: { id: true, currentTier: true },
    where: eq(users.id, userId),
  });

  if (!user) {
    return { promoted: false };
  }

  const currentStored = user.currentTier;
  if (!isHigherTier(nextTier, currentStored)) {
    return { promoted: false };
  }

  await db
    .update(users)
    .set({ currentTier: nextTier, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { promoted: true, newTier: nextTier };
}
