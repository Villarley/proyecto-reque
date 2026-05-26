"use client";

import type { ChapterResolveResponse, ProfileLanguage } from "@stellar-orbit/types";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type ChapterAssignmentProps = {
  countryCode: string;
  language: ProfileLanguage;
  chapterId: string | null;
  onChapterIdChange: (chapterId: string | null) => void;
  disabled?: boolean;
};

function isProfileLanguage(value: string): value is ProfileLanguage {
  return value === "en" || value === "es" || value === "pt";
}

export function ChapterAssignment({
  countryCode,
  language,
  chapterId,
  onChapterIdChange,
  disabled = false,
}: ChapterAssignmentProps) {
  const { t } = useI18n();
  const [resolution, setResolution] = useState<ChapterResolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const code = countryCode.trim().toUpperCase();
    if (code.length !== 2) return;

    const lang = isProfileLanguage(language) ? language : "en";
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const result = await apiFetch<ChapterResolveResponse>(
          `/chapters/resolve?countryCode=${encodeURIComponent(code)}&language=${encodeURIComponent(lang)}`,
        );
        if (cancelled) return;
        setResolution(result);
        if (result.match === "direct") {
          onChapterIdChange(result.chapter.id);
        } else if (result.match === "suggestions") {
          const stillValid =
            chapterId !== null &&
            result.suggestions.some((chapter) => chapter.id === chapterId);
          if (!stillValid) {
            onChapterIdChange(null);
          }
        } else {
          onChapterIdChange(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : t.common.error);
          setResolution(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // chapterId intentionally omitted — only re-resolve when country/language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, language]);

  if (loading && !resolution) {
    return (
      <p className="text-sm text-orbit-text-2">{t.onboarding.chapterLoading}</p>
    );
  }

  if (fetchError) {
    return <p className="text-sm text-red-400" role="alert">{fetchError}</p>;
  }

  if (!resolution) return null;

  if (resolution.match === "direct") {
    return (
      <div className="rounded-lg border border-orbit-border bg-orbit-raised/60 px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-orbit-text-3">
          {t.onboarding.assignedChapter}
        </p>
        <p className="mt-1 text-sm font-semibold text-orbit-text">{resolution.chapter.name}</p>
        <p className="mt-0.5 text-xs text-orbit-text-2">
          {resolution.chapter.countryCode}
          {resolution.chapter.region ? ` · ${resolution.chapter.region}` : ""}
        </p>
      </div>
    );
  }

  if (resolution.match === "none") {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
        role="status"
      >
        <p className="font-medium">{t.onboarding.chapterNoneTitle}</p>
        <p className="mt-1 leading-6">{t.onboarding.chapterNoneBody}</p>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="text-sm font-medium text-orbit-text-2">
        {t.onboarding.selectChapter}
      </legend>
      <p className="text-sm leading-6 text-orbit-text-2">{t.onboarding.chapterUnavailable}</p>
      <ul className="flex flex-col gap-2">
        {resolution.suggestions.map((chapter) => {
          const selected = chapterId === chapter.id;
          return (
            <li key={chapter.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                  selected
                    ? "border-orbit-violet/50 bg-orbit-violet/5"
                    : "border-orbit-border bg-orbit-raised/40 hover:border-orbit-text/20"
                }`}
              >
                <input
                  type="radio"
                  name="chapter-assignment"
                  className="mt-1"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => {
                    onChapterIdChange(chapter.id);
                  }}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-orbit-text">{chapter.name}</span>
                  <span className="text-xs text-orbit-text-2">
                    {chapter.countryCode}
                    {chapter.region ? ` · ${chapter.region}` : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {!chapterId ? (
        <p className="text-xs text-orbit-text-3">{t.onboarding.chapterRequired}</p>
      ) : null}
    </fieldset>
  );
}
