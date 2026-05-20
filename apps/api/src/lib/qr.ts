import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../env.js";

const tokenPayloadSchema = z.object({
  eventId: z.string().uuid(),
  exp: z.number().int(),
});

function base64UrlEncode(bytes: Buffer): string {
  return bytes
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(segment: string): Buffer {
  const padded = segment.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(segment.length / 4) * 4,
    "=",
  );
  return Buffer.from(padded, "base64");
}

export function createEventCheckInToken(eventId: string, validUntil: Date): string {
  const exp = Math.floor(validUntil.getTime() / 1000);
  const payload = JSON.stringify({ eventId, exp });
  const payloadB64 = base64UrlEncode(Buffer.from(payload, "utf8"));
  const hmac = createHmac("sha256", env.QR_SIGNING_SECRET);
  hmac.update(payloadB64);
  const sig = base64UrlEncode(hmac.digest());
  return `${payloadB64}.${sig}`;
}

export function parseEventCheckInToken(token: string): { eventId: string; exp: number } {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) {
    throw new Error("Malformed QR token");
  }

  const expectedSig = base64UrlEncode(
    createHmac("sha256", env.QR_SIGNING_SECRET).update(payloadB64).digest(),
  );
  const a = Buffer.from(expectedSig);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid QR token signature");
  }

  const parsed = tokenPayloadSchema.safeParse(
    JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as unknown,
  );
  if (!parsed.success) {
    throw new Error("Invalid QR token payload");
  }

  return parsed.data;
}

export function assertTokenActive(validUntilSeconds: number): void {
  const now = Math.floor(Date.now() / 1000);
  if (now > validUntilSeconds) {
    throw new Error("QR token expired");
  }
}

/** End of calendar day (UTC) for a given instant. */
export function endOfUtcDay(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
  return d;
}
