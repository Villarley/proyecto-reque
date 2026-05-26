import type { ProfileLanguage } from "@stellar-orbit/types";
import { defaultLanguageForCountry, parseProfileLanguage } from "./country-language.js";

const ACCOUNT_VERIFIED: Record<ProfileLanguage, { title: string; body: string }> = {
  en: {
    title: "Account verified",
    body: "Your first event check-in is complete. Your ambassador account is now verified.",
  },
  es: {
    title: "Cuenta verificada",
    body: "Completaste tu primer check-in en un evento. Tu cuenta de embajador ya está verificada.",
  },
  pt: {
    title: "Conta verificada",
    body: "Seu primeiro check-in em um evento foi concluído. Sua conta de embaixador agora está verificada.",
  },
};

export function profileLanguageForUser(user: {
  language: string | null;
  countryCode: string;
}): ProfileLanguage {
  return parseProfileLanguage(user.language ?? "") ?? defaultLanguageForCountry(user.countryCode);
}

export function accountVerifiedNotificationCopy(language: ProfileLanguage): {
  title: string;
  body: string;
} {
  return ACCOUNT_VERIFIED[language];
}
