import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

/** In-memory per-instance buckets (best-effort on serverless; stops casual abuse). */
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 20_000;

function prune(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key — e.g. `search:${ip}`
 */
export function allowRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number
): boolean {
  const now = Date.now();
  prune(now);
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return b.count <= maxPerWindow;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return ip || "unknown";
}
