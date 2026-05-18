import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().email("RESEND_FROM_EMAIL must be a valid email"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
  QR_SIGNING_SECRET: z.string().min(32, "QR_SIGNING_SECRET must be at least 32 characters"),
  EVENT_CHECKIN_POINTS: z.preprocess((val) => {
    const raw = typeof val === "string" ? val.trim() : "";
    const source = raw === "" ? "100" : raw;
    const parsed = Number.parseInt(source, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
  }, z.number().int()),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
