import { eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { chapters } from "../db/schema.js";

export async function userBelongsToCountryChapter(
  db: Database,
  params: { userChapterId: string; countryCode: string },
): Promise<boolean> {
  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.id, params.userChapterId),
  });
  return chapter?.countryCode === params.countryCode.trim().toUpperCase();
}
