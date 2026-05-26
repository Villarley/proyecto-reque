"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ProfileLanguage } from "@stellar-orbit/types";
import type { Messages } from "./messages/en";
import en from "./messages/en";
import es from "./messages/es";
import pt from "./messages/pt";
import { apiFetchWithAuth } from "@/lib/api";

const MESSAGES: Record<string, Messages> = { en, es, pt };
const STORAGE_KEY = "stellar-orbit.language";
const SESSION_KEY = "stellar-orbit.sessionToken";

function getMessages(lang: string): Messages {
  return MESSAGES[lang] ?? en;
}

function isProfileLanguage(value: string): value is ProfileLanguage {
  return value === "en" || value === "es" || value === "pt";
}

const I18nContext = createContext<{
  t: Messages;
  lang: string;
  setLang: (lang: string) => void;
}>({
  t: en,
  lang: "en",
  setLang: () => undefined,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    let cancelled = false;

    async function hydrateLanguage() {
      const token = window.localStorage.getItem(SESSION_KEY);
      if (token) {
        try {
          const res = await apiFetchWithAuth<{
            user: { language?: string | null };
          }>(token, "/profile/me");
          const userLang = res.user.language ?? "";
          if (isProfileLanguage(userLang) && MESSAGES[userLang]) {
            if (!cancelled) {
              setLangState(userLang);
              window.localStorage.setItem(STORAGE_KEY, userLang);
            }
            return;
          }
        } catch {
          // Fall back to localStorage when profile is unavailable.
        }
      }

      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!cancelled && stored && MESSAGES[stored]) {
        setLangState(stored);
      }
    }

    void hydrateLanguage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(newLang: string) {
    if (!MESSAGES[newLang]) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);

    const token = window.localStorage.getItem(SESSION_KEY);
    if (!token || !isProfileLanguage(newLang)) {
      return;
    }

    void apiFetchWithAuth(token, "/profile/me", {
      method: "PATCH",
      body: JSON.stringify({ language: newLang }),
    }).catch(() => {
      // UI language still updates locally if persistence fails.
    });
  }

  return (
    <I18nContext.Provider value={{ t: getMessages(lang), lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
