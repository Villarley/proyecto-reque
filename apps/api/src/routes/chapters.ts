import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { defaultLanguageForCountry } from "../lib/country-language.js";
import { resolveChapterForUser } from "../lib/chapter-resolve.js";

const resolveQuerySchema = z.object({
  countryCode: z.string().length(2),
  language: z.enum(["en", "es", "pt"]).optional(),
});

export const chaptersRoutes = new Hono().get(
  "/resolve",
  zValidator("query", resolveQuerySchema),
  async (c) => {
    const { countryCode, language } = c.req.valid("query");
    const effectiveLanguage = language ?? defaultLanguageForCountry(countryCode);
    const result = await resolveChapterForUser(db, {
      countryCode,
      language: effectiveLanguage,
    });
    return c.json(result);
  },
);
