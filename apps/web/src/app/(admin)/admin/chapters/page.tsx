"use client";

import type { Chapter, ProfileLanguage } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { CountrySelector } from "@/components/CountrySelector";
import { useI18n } from "@/i18n/I18nProvider";

type ChaptersResponse = { chapters: Chapter[] };

const LANGUAGES: { value: ProfileLanguage; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
];

function getToken() {
  return window.localStorage.getItem("stellar-orbit.sessionToken") ?? "";
}

export default function AdminChaptersPage() {
  const { t } = useI18n();
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [region, setRegion] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState<ProfileLanguage>("en");
  const [createError, setCreateError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadChapters() {
    const token = getToken();
    if (!token) throw new Error(t.validation.notSignedIn);
    const res = await apiFetchWithAuth<ChaptersResponse>(token, "/admin/chapters");
    setChapters(res.chapters);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      try {
        await loadChapters();
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t.adminChapters.loadError);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setCreateError(t.adminChapters.nameRequired);
      return;
    }

    setBusy(true);
    try {
      const token = getToken();
      if (!token) throw new Error(t.validation.notSignedIn);

      await apiFetchWithAuth<{ chapter: Chapter }>(token, "/admin/chapters", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          countryCode,
          region: region.trim() || undefined,
          primaryLanguage,
        }),
      });

      setName("");
      setRegion("");
      setSuccess(t.adminChapters.created);
      await loadChapters();
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const body = JSON.parse(err.message) as { error?: string };
          if (body.error === "chapter_country_exists") {
            setCreateError(t.adminChapters.countryExists);
            return;
          }
        } catch {
          /* plain text */
        }
      }
      setCreateError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t.adminChapters.createFailed,
      );
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-400" role="alert">
        {loadError}
      </p>
    );
  }

  if (!chapters) {
    return <p className="text-sm text-orbit-text-2">{t.common.loading}</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-3xl border border-orbit-border bg-white px-6 py-6 shadow-orbit-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orbit-text-3">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.adminChapters.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-orbit-text-2">
          {t.adminChapters.subtitle}
        </p>
      </section>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-orbit-text">{t.adminChapters.createTitle}</h2>
        <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => { void onCreate(e); }}>
          <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
            {t.adminChapters.name}
            <input
              required
              className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 font-normal text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
              value={name}
              onChange={(ev) => { setName(ev.target.value); }}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
            {t.adminChapters.country}
            <CountrySelector
              id="admin-chapter-country"
              value={countryCode}
              onChange={setCountryCode}
              disabled={busy}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
            {t.adminChapters.region}
            <input
              className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 font-normal text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
              value={region}
              onChange={(ev) => { setRegion(ev.target.value); }}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
            {t.adminChapters.primaryLanguage}
            <select
              className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 font-normal text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
              value={primaryLanguage}
              onChange={(ev) => {
                setPrimaryLanguage(ev.target.value as ProfileLanguage);
              }}
              disabled={busy}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>

          {createError ? (
            <p className="text-sm text-red-400" role="alert">
              {createError}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm font-semibold text-emerald-600" role="status">
              {success}
            </p>
          ) : null}

          <Button type="submit" disabled={busy} className="self-start">
            {busy ? t.adminChapters.creating : t.adminChapters.create}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-orbit-border bg-orbit-raised/60 text-xs font-semibold uppercase tracking-wide text-orbit-text-3">
              <tr>
                <th className="px-4 py-3">{t.adminChapters.name}</th>
                <th className="px-4 py-3">{t.adminChapters.country}</th>
                <th className="px-4 py-3">{t.adminChapters.region}</th>
                <th className="px-4 py-3">{t.adminChapters.primaryLanguage}</th>
                <th className="px-4 py-3">{t.adminChapters.createdAt}</th>
              </tr>
            </thead>
            <tbody>
              {chapters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-orbit-text-2">
                    {t.adminChapters.empty}
                  </td>
                </tr>
              ) : (
                chapters.map((chapter) => (
                  <tr key={chapter.id} className="border-b border-orbit-border last:border-0">
                    <td className="px-4 py-3 font-medium text-orbit-text">{chapter.name}</td>
                    <td className="px-4 py-3">{chapter.countryCode}</td>
                    <td className="px-4 py-3 text-orbit-text-2">{chapter.region ?? "—"}</td>
                    <td className="px-4 py-3 uppercase">{chapter.primaryLanguage}</td>
                    <td className="px-4 py-3 text-orbit-text-2">
                      {new Date(chapter.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
