import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

const rawUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

export type WebEnv = z.infer<typeof schema>;

export const env: WebEnv = schema.parse({
  NEXT_PUBLIC_API_URL: rawUrl,
});
