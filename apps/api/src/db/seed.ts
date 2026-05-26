import { eq } from "drizzle-orm";
import type { LevelTier } from "@stellar-orbit/types";
import { db } from "./index.js";
import { chapters, levels } from "./schema.js";

const chapterSeeds = [
  {
    name: "Costa Rica",
    countryCode: "CR",
    region: null as string | null,
    primaryLanguage: "es" as const,
  },
  {
    name: "United States",
    countryCode: "US",
    region: null,
    primaryLanguage: "en" as const,
  },
  {
    name: "Global",
    countryCode: "GL",
    region: null,
    primaryLanguage: "en" as const,
  },
] as const;

const levelSeeds = [
  { tier: "explorer" as const, displayName: "Explorer", minPoints: 0 },
  { tier: "stellar_pioneer" as const, displayName: "Stellar Pioneer", minPoints: 250 },
  { tier: "orbit_builder" as const, displayName: "Orbit Builder", minPoints: 1000 },
  { tier: "nova_ambassador" as const, displayName: "Nova Ambassador", minPoints: 2500 },
  { tier: "ecosystem_leader" as const, displayName: "Ecosystem Leader", minPoints: 5000 },
] as const satisfies ReadonlyArray<{
  tier: LevelTier;
  displayName: string;
  minPoints: number;
}>;

async function seedChapters(): Promise<void> {
  for (const chapter of chapterSeeds) {
    const existing = await db.query.chapters.findFirst({
      where: eq(chapters.countryCode, chapter.countryCode),
    });
    if (existing) {
      await db
        .update(chapters)
        .set({ primaryLanguage: chapter.primaryLanguage })
        .where(eq(chapters.id, existing.id));
      continue;
    }

    await db.insert(chapters).values({
      name: chapter.name,
      countryCode: chapter.countryCode,
      region: chapter.region,
      primaryLanguage: chapter.primaryLanguage,
    });
  }

  console.log("[seed] Chapters upserted");
}

async function seedLevels(): Promise<void> {
  for (const [idx, seed] of levelSeeds.entries()) {
    await db
      .insert(levels)
      .values({
        tier: seed.tier,
        displayName: seed.displayName,
        minPoints: seed.minPoints,
        maxPoints: null,
        sortOrder: idx + 1,
      })
      .onConflictDoUpdate({
        target: levels.tier,
        set: {
          displayName: seed.displayName,
          minPoints: seed.minPoints,
          sortOrder: idx + 1,
        },
      });
  }

  console.log("[seed] Levels upserted");
}

async function main(): Promise<void> {
  console.log("[seed] starting");
  await seedChapters();
  await seedLevels();
  console.log("[seed] done");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[seed] failed", err instanceof Error ? err.message : err);
    process.exit(1);
  });
