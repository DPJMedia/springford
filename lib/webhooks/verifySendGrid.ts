import { createPublicKey, timingSafeEqual, verify } from "node:crypto";
export function verifySendGridRequest(
  headers: Headers,
  body: string,
  url: URL,
  config: { publicKey?: string; token?: string },
): boolean {
  if (config.publicKey) {
    try {
      const signature = headers.get("x-twilio-email-event-webhook-signature");
      const timestamp = headers.get("x-twilio-email-event-webhook-timestamp");
      if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
      const key = createPublicKey({
        key: Buffer.from(config.publicKey, "base64"),
        format: "der",
        type: "spki",
      });
      return verify(
        "sha256",
        Buffer.from(timestamp + body),
        key,
        Buffer.from(signature, "base64"),
      );
    } catch {
      return false;
    }
  }
  if (!config.token) return false;
  const supplied = url.searchParams.get("token") || "";
  const a = Buffer.from(supplied),
    b = Buffer.from(config.token);
  return a.length === b.length && timingSafeEqual(a, b);
}
