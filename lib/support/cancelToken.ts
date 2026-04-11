import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC-signed token for one-click cancel from thank-you email (no login).
 * Set SUPPORT_CANCEL_TOKEN_SECRET in production; falls back to STRIPE_WEBHOOK_SECRET.
 */
function getSecret(): string {
  return (
    process.env.SUPPORT_CANCEL_TOKEN_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    ""
  );
}

export type SupportCancelTokenPayload = {
  sub: string;
  uid: string;
  em: string;
  /** Canonical site base URL for redirects (no trailing slash). */
  siteUrl?: string;
  siteName?: string;
};

export function createSupportCancelToken(
  subscriptionId: string,
  userId: string,
  email: string,
  branding?: { siteUrl: string; siteName: string },
): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error("Missing SUPPORT_CANCEL_TOKEN_SECRET or STRIPE_WEBHOOK_SECRET");
  }
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90; // 90 days
  const payload = Buffer.from(
    JSON.stringify({
      sub: subscriptionId,
      uid: userId,
      em: email,
      exp,
      ...(branding
        ? { siteUrl: branding.siteUrl.replace(/\/$/, ""), siteName: branding.siteName }
        : {}),
    }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySupportCancelToken(token: string): SupportCancelTokenPayload | null {
  const secret = getSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    sub?: string;
    uid?: string;
    em?: string;
    exp?: number;
    siteUrl?: string;
    siteName?: string;
  };
  if (!data.sub || !data.uid || !data.em || !data.exp) return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    sub: data.sub,
    uid: data.uid,
    em: data.em,
    ...(data.siteUrl ? { siteUrl: data.siteUrl } : {}),
    ...(data.siteName ? { siteName: data.siteName } : {}),
  };
}
