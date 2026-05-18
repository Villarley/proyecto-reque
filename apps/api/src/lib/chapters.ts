import { eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { chapters } from "../db/schema.js";

/**
 * Ensures a chapter exists for a country; creates a placeholder if missing.
 * Production should seed chapters and/or use admin tools instead of auto-create.
 */
export async function resolveChapterIdForCountry(
  db: Database,
  countryCode: string,
): Promise<string> {
  const normalized = countryCode.trim().toUpperCase();
  const existing = await db.query.chapters.findFirst({
    where: eq(chapters.countryCode, normalized),
  });
  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(chapters)
    .values({
      name: `Chapter ${normalized}`,
      countryCode: normalized,
      region: null,
    })
    .returning({ id: chapters.id });

  if (!created) {
    throw new Error("Could not create chapter for country");
  }

  return created.id;
}

export async function userBelongsToCountryChapter(
  db: Database,
  params: { userChapterId: string; countryCode: string },
): Promise<boolean> {
  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.id, params.userChapterId),
  });
  return chapter?.countryCode === params.countryCode.trim().toUpperCase();
}
