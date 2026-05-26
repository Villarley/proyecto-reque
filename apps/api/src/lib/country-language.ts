import type { ProfileLanguage } from "@stellar-orbit/types";

const PORTUGUESE_COUNTRIES = new Set(["BR", "PT", "AO", "MZ"]);

const SPANISH_COUNTRIES = new Set([
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "SV",
  "GQ",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PY",
  "PE",
  "PR",
  "ES",
  "UY",
  "VE",
]);

export function defaultLanguageForCountry(countryCode: string): ProfileLanguage {
  const normalized = countryCode.trim().toUpperCase();
  if (PORTUGUESE_COUNTRIES.has(normalized)) {
    return "pt";
  }
  if (SPANISH_COUNTRIES.has(normalized)) {
    return "es";
  }
  return "en";
}

export function parseProfileLanguage(value: string): ProfileLanguage | null {
  if (value === "en" || value === "es" || value === "pt") {
    return value;
  }
  return null;
}
