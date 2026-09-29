/**
 * Minimal in-memory rate limiter for public server actions (Phase 13).
 *
 * Sliding-window counters keyed by `${bucket}:${ip}`. Per-process memory is
 * deliberate: the preview/production server runs as a single Node instance.
 * On multi-instance hosting (e.g. Vercel serverless), swap the Map for a
 * shared store (Upstash Redis) — the call sites stay identical.
 *
 * Limits are sized for a college festival where many participants share one
 * campus NAT IP, so thresholds are generous but still stop scripted abuse.
 */

const buckets = new Map<string, number[]>();

export interface RateLimitRule {
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const RATE_LIMITS = {
  /** Public contact form. */
  contact: { limit: 8, windowMs: 15 * 60 * 1000 },
  /** Registration confirm (a lab full of students may share one IP). */
  registration: { limit: 30, windowMs: 60 * 60 * 1000 },
  /** Staff sign-in (brute-force guard). */
  login: { limit: 10, windowMs: 5 * 60 * 1000 },
} satisfies Record<string, RateLimitRule>;

/** Best-effort client IP from proxy headers (set by the host/CDN). */
export async function getClientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Consume one request slot. Returns false when the caller is over the limit.
 */
export function allowRequest(bucket: string, ip: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < rule.windowMs);

  if (timestamps.length >= rule.limit) {
    buckets.set(key, timestamps); // prune even on rejection
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, ts] of buckets) {
      if (ts.length === 0 || now - ts[ts.length - 1]! > rule.windowMs) {
        buckets.delete(k);
      }
    }
  }
  return true;
}

/** Convenience: check a named rule for the current client. */
export async function allow(bucket: keyof typeof RATE_LIMITS): Promise<boolean> {
  const ip = await getClientIp();
  return allowRequest(bucket, ip, RATE_LIMITS[bucket]);
}
