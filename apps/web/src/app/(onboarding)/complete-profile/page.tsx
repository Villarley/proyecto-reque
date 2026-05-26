"use client";

import type { ProfileLanguage } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { BrandBadge } from "@/components/BrandLogo";
import { ChapterAssignment } from "@/components/ChapterAssignment";
import { CountrySelector } from "@/components/CountrySelector";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useSession } from "@/hooks/useSession";
import { useI18n } from "@/i18n/I18nProvider";

type MeResponse = {
  user: {
    name: string | null;
    email: string | null;
    countryCode: string;
    language?: string | null;
    chapterId?: string | null;
  };
  profileComplete: boolean;
};

const LANGUAGES: { value: ProfileLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
];

function dashboardForRole(role: string): string {
  switch (role) {
    case "country_lead":
      return "/cl/events";
    case "global_admin":
      return "/admin/analytics";
    default:
      return "/dashboard";
  }
}

function getToken() {
  return window.localStorage.getItem("stellar-orbit.sessionToken") ?? "";
}

function isProfileLanguage(value: string): value is ProfileLanguage {
  return value === "en" || value === "es" || value === "pt";
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const session = useSession();
  const { t, lang, setLang } = useI18n();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [language, setLanguage] = useState<ProfileLanguage>("en");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProfileLanguage(lang)) {
      setLanguage(lang);
    }
  }, [lang]);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      router.replace("/login");
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    void apiFetchWithAuth<MeResponse>(token, "/profile/me")
      .then((res) => {
        if (res.profileComplete) {
          router.replace(dashboardForRole(session.role));
          return;
        }
        setName(res.user.name ?? "");
        setEmail(res.user.email ?? "");
        setCountryCode(res.user.countryCode || "US");
        const userLang = res.user.language ?? "";
        if (isProfileLanguage(userLang)) {
          setLanguage(userLang);
          setLang(userLang);
        } else if (isProfileLanguage(lang)) {
          setLanguage(lang);
        }
        setChapterId(res.user.chapterId ?? null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [session, router, lang, setLang]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError(t.onboarding.nameRequired);
      return;
    }
    if (!trimmedEmail) {
      setError(t.onboarding.emailRequired);
      return;
    }
    if (!chapterId) {
      setError(t.onboarding.chapterRequired);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const token = getToken();
      await apiFetchWithAuth(token, "/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          countryCode,
          language,
          chapterId,
        }),
      });
      router.push(dashboardForRole(session.role));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t.onboarding.saveFailed,
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === undefined || loading) {
    return <p className="text-sm text-orbit-text-2">{t.common.loading}</p>;
  }

  if (session === null) return null;

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex w-full justify-end">
          <LanguageSwitcher />
        </div>
        <BrandBadge priority />
        <div>
          <h1 className="text-2xl font-bold text-orbit-text">{t.onboarding.title}</h1>
          <p className="mt-1 text-sm text-orbit-text-2">{t.onboarding.subtitle}</p>
        </div>
      </header>

      <Card className="p-6">
        <form className="flex flex-col gap-4" onSubmit={(e) => { void onSubmit(e); }}>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.onboarding.fullName} <span className="text-red-400">*</span>
            <input
              required
              autoFocus
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:border-orbit-violet/50 focus:outline-none"
              placeholder={t.onboarding.namePlaceholder}
              value={name}
              onChange={(e) => { setName(e.target.value); }}
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.profile.email} <span className="text-red-400">*</span>
            <input
              type="email"
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:border-orbit-violet/50 focus:outline-none"
              placeholder={t.onboarding.emailPlaceholder}
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.profile.country}
            <CountrySelector
              id="onboarding-country"
              value={countryCode}
              onChange={setCountryCode}
              disabled={busy}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.onboarding.language}
            <select
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:border-orbit-violet/50 focus:outline-none"
              value={language}
              onChange={(e) => {
                const next = e.target.value;
                if (!isProfileLanguage(next)) return;
                setLanguage(next);
                setLang(next);
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

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={busy || !chapterId} className="w-full">
            {busy ? t.common.saving : t.onboarding.continue}
          </Button>
        </form>
      </Card>
    </div>
  );
}
