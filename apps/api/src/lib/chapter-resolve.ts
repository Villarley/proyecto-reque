import { and, asc, eq, ne } from "drizzle-orm";
import type {
  Chapter,
  ChapterResolveResponse,
  ProfileLanguage,
} from "@stellar-orbit/types";
import type { Database } from "../db/index.js";
import { chapters, type ChapterRow } from "../db/schema.js";
import { defaultLanguageForCountry, parseProfileLanguage } from "./country-language.js";

const SUGGESTION_LIMIT = 8;

export function chapterFromRow(row: ChapterRow): Chapter {
  const primaryLanguage =
    parseProfileLanguage(row.primaryLanguage) ?? defaultLanguageForCountry(row.countryCode);

  return {
    id: row.id,
    name: row.name,
    countryCode: row.countryCode,
    region: row.region,
    primaryLanguage,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findChapterByCountry(
  db: Database,
  countryCode: string,
): Promise<Chapter | null> {
  const normalized = countryCode.trim().toUpperCase();
  const row = await db.query.chapters.findFirst({
    where: eq(chapters.countryCode, normalized),
  });
  return row ? chapterFromRow(row) : null;
}

export async function findChaptersByLanguage(
  db: Database,
  language: ProfileLanguage,
  excludeCountryCode?: string,
): Promise<Chapter[]> {
  const exclude = excludeCountryCode?.trim().toUpperCase();
  const whereClause = exclude
    ? and(eq(chapters.primaryLanguage, language), ne(chapters.countryCode, exclude))
    : eq(chapters.primaryLanguage, language);

  const rows = await db.query.chapters.findMany({
    where: whereClause,
    orderBy: [asc(chapters.name)],
    limit: SUGGESTION_LIMIT,
  });

  return rows.map(chapterFromRow);
}

export async function resolveChapterForUser(
  db: Database,
  params: { countryCode: string; language: ProfileLanguage },
): Promise<ChapterResolveResponse> {
  const countryCode = params.countryCode.trim().toUpperCase();
  const direct = await findChapterByCountry(db, countryCode);
  if (direct) {
    return { match: "direct", chapter: direct };
  }

  const suggestions = await findChaptersByLanguage(db, params.language, countryCode);
  if (suggestions.length > 0) {
    return { match: "suggestions", suggestions };
  }

  return { match: "none" };
}

export function isChapterIdAllowed(
  chapterId: string,
  resolution: ChapterResolveResponse,
): boolean {
  if (resolution.match === "direct") {
    return resolution.chapter.id === chapterId;
  }
  if (resolution.match === "suggestions") {
    return resolution.suggestions.some((chapter) => chapter.id === chapterId);
  }
  return false;
}

export async function resolveChapterIdForCountry(
  db: Database,
  countryCode: string,
): Promise<string | null> {
  const chapter = await findChapterByCountry(db, countryCode);
  return chapter?.id ?? null;
}
