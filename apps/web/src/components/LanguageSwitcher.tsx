"use client";

import { useI18n } from "@/i18n/I18nProvider";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "pt", label: "PT" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-orbit-border bg-orbit-raised p-0.5">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => {
            setLang(l.code);
          }}
          className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
            lang === l.code
              ? "bg-orbit-surface text-orbit-violet shadow-orbit-sm"
              : "text-orbit-text-3 hover:text-orbit-text"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
