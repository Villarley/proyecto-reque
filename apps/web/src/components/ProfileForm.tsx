"use client";

import type { Chapter, ProfileLanguage, Role } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { useEffect, useState, type SyntheticEvent } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { ChapterAssignment } from "@/components/ChapterAssignment";
import { CountrySelector } from "@/components/CountrySelector";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/messages/en";

type MeUser = {
  id: string;
  stellarPublicKey: string;
  name: string | null;
  email: string | null;
  countryCode: string;
  language: string | null;
  role: Role;
  chapterId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProfileMeResponse = {
  user: MeUser & { chapter: Chapter | null };
  totalPoints: number;
};

const LANGUAGES: { value: ProfileLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
];

function truncateMiddle(value: string, left = 8, right = 6): string {
  if (value.length <= left + right) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function roleLabel(role: Role, t: Messages): string {
  if (role in t.roles) {
    return t.roles[role as keyof Messages["roles"]];
  }
  return role.replaceAll("_", " ");
}

function isProfileLanguage(value: string): value is ProfileLanguage {
  return value === "en" || value === "es" || value === "pt";
}

export function ProfileForm() {
  const { t, lang, setLang } = useI18n();
  const profile = useApi<ProfileMeResponse>(["profile", "me"], "/profile/me");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [language, setLanguage] = useState<ProfileLanguage>("en");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!profile.data?.user) return;
    const u = profile.data.user;
    setName(u.name ?? "");
    setEmail(u.email ?? "");
    setCountryCode(u.countryCode || "US");
    const userLang = u.language ?? "";
    if (isProfileLanguage(userLang)) {
      setLanguage(userLang);
    } else if (isProfileLanguage(lang)) {
      setLanguage(lang);
    }
    setChapterId(u.chapterId);
  }, [profile.data?.user, lang]);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chapterId) {
      setToast({ type: "err", text: t.onboarding.chapterRequired });
      window.setTimeout(() => { setToast(null); }, 5000);
      return;
    }

    setBusy(true);
    setToast(null);
    try {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) throw new Error(t.validation.notSignedIn);
      await apiFetchWithAuth<{ user: MeUser }>(token, "/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          countryCode,
          language,
          chapterId,
        }),
      });
      setLang(language);
      setToast({ type: "ok", text: t.profile.saved });
      await profile.refetch();
      window.setTimeout(() => { setToast(null); }, 4000);
    } catch (err) {
      setToast({
        type: "err",
        text:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : t.profile.updateFailed,
      });
      window.setTimeout(() => { setToast(null); }, 5000);
    } finally {
      setBusy(false);
    }
  }

  if (profile.isLoading) {
    return <p className="text-sm text-orbit-text-2">{t.profile.loading}</p>;
  }

  if (profile.isError || !profile.data) {
    return <p className="text-sm text-red-400">{t.profile.loadError}</p>;
  }

  const { user } = profile.data;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <section className="rounded-3xl border border-orbit-border bg-white px-6 py-6 shadow-orbit-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orbit-text-3">
          {t.profile.account}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.profile.title}</h1>
        <p className="mt-2 text-sm leading-6 text-orbit-text-2">{t.profile.subtitle}</p>
      </section>

      {toast ? (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm ${
            toast.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <form
          className="grid gap-0 md:grid-cols-[1.3fr_0.9fr]"
          onSubmit={(e) => { void handleSubmit(e); }}
        >
          <div className="flex flex-col gap-5 p-6">
            <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
              {t.profile.name}
              <input
                className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 text-sm text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
                value={name}
                onChange={(e) => { setName(e.target.value); }}
                autoComplete="name"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
              {t.profile.email} <span className="text-red-400">*</span>
              <input
                type="email"
                required
                className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 text-sm text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
                value={email}
                onChange={(e) => { setEmail(e.target.value); }}
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
              {t.profile.country}
              <CountrySelector
                id="profile-country"
                value={countryCode}
                onChange={setCountryCode}
                disabled={busy}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
              {t.onboarding.language}
              <select
                className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 text-sm text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
                value={language}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!isProfileLanguage(next)) return;
                  setLanguage(next);
                }}
                disabled={busy}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <ChapterAssignment
              countryCode={countryCode}
              language={language}
              chapterId={chapterId}
              onChapterIdChange={setChapterId}
              disabled={busy}
            />

            <Button type="submit" disabled={busy || !chapterId} className="mt-2 w-full">
              {busy ? t.common.saving : t.profile.saveChanges}
            </Button>
          </div>

          <div className="border-t border-orbit-border bg-orbit-raised/50 p-6 md:border-l md:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orbit-text-3">
              {t.profile.readOnly}
            </p>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-orbit-text-3">{t.profile.walletAddress}</dt>
                <dd
                  className="mt-1 break-all font-mono text-xs text-orbit-text-2"
                  title={user.stellarPublicKey}
                >
                  {truncateMiddle(user.stellarPublicKey)}
                </dd>
              </div>
              <div>
                <dt className="text-orbit-text-3">{t.profile.chapter}</dt>
                <dd className="mt-0.5 font-medium">
                  {user.chapter?.name ?? t.common.noData}
                </dd>
              </div>
              <div>
                <dt className="text-orbit-text-3">{t.profile.role}</dt>
                <dd className="mt-0.5 font-medium">{roleLabel(user.role, t)}</dd>
              </div>
            </dl>
          </div>
        </form>
      </Card>
    </div>
  );
}
