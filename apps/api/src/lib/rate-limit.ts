type WindowEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, WindowEntry>();

const WINDOW_MS = 60_000;

export function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function clientIpFromRequest(forwardedFor: string | undefined): string {
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
