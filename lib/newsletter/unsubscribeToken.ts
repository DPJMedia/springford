import { createHmac, timingSafeEqual } from "node:crypto";
function secret() {
  const key =
    process.env.NEWSLETTER_TOKEN_SECRET ||
    process.env.SUPPORT_CANCEL_TOKEN_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET;
  if (!key) throw new Error("Newsletter token secret is not configured");
  return key;
}
export function createNewsletterUnsubscribeToken(
  userId: string,
  tenantId: string,
) {
  const data = Buffer.from(
    JSON.stringify({ userId, tenantId, purpose: "newsletter-unsubscribe" }),
  ).toString("base64url");
  return `${data}.${createHmac("sha256", secret()).update(data).digest("base64url")}`;
}
export function verifyNewsletterUnsubscribeToken(
  token: string,
): { userId: string; tenantId: string } | null {
  try {
    if (token.length > 2048) return null;
    const [data, sig, ...rest] = token.split(".");
    if (!data || !sig || rest.length) return null;
    const a = Buffer.from(sig),
      b = Buffer.from(
        createHmac("sha256", secret()).update(data).digest("base64url"),
      );
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    if (
      p.purpose !== "newsletter-unsubscribe" ||
      typeof p.userId !== "string" ||
      typeof p.tenantId !== "string"
    )
      return null;
    return { userId: p.userId, tenantId: p.tenantId };
  } catch {
    return null;
  }
}
