import { describe, expect, it, vi } from "vitest";
import { createSign, generateKeyPairSync } from "node:crypto";
import { serializeJsonLd } from "../lib/seo/serializeJsonLd";
import { verifySendGridRequest } from "../lib/webhooks/verifySendGrid";
import {
  createNewsletterUnsubscribeToken,
  verifyNewsletterUnsubscribeToken,
} from "../lib/newsletter/unsubscribeToken";
import {
  createSupportCancelToken,
  verifySupportCancelToken,
} from "../lib/support/cancelToken";
import { isSameOriginRequest } from "../lib/http/sameOrigin";
import { canReadFullArticleContent } from "../lib/articles/visibilityAccess";
describe("public security boundaries", () => {
  it("escapes script terminators without changing structured data", () => {
    const value = { headline: "</script><script>alert(1)</script>\u2028" };
    const json = serializeJsonLd(value);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(value);
  });
  it("rejects cross-site writes and accepts same-origin requests", () => {
    expect(
      isSameOriginRequest(
        new Request("https://news.test/api", {
          headers: { origin: "https://evil.test" },
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        new Request("https://news.test/api", {
          headers: { origin: "https://news.test" },
        }),
      ),
    ).toBe(true);
  });
  it("does not grant newsletter access based on an unrelated subscription", () => {
    expect(
      canReadFullArticleContent("newsletter_subscribers", {
        newsletterSubscribed: false,
        isAdmin: false,
      }),
    ).toBe(false);
    expect(
      canReadFullArticleContent("newsletter_subscribers", {
        newsletterSubscribed: true,
        isAdmin: false,
      }),
    ).toBe(true);
  });
  it("preserves staff preview access", () => {
    expect(
      canReadFullArticleContent("newsletter_subscribers", {
        newsletterSubscribed: false,
        isAdmin: true,
      }),
    ).toBe(true);
  });
  it("rejects unsigned SendGrid requests when no token or key is configured", () => {
    expect(
      verifySendGridRequest(
        new Headers(),
        "[]",
        new URL("https://news.test/hook"),
        {},
      ),
    ).toBe(false);
  });
  it("preserves the existing secret-token webhook while signing is staged", () => {
    expect(
      verifySendGridRequest(
        new Headers(),
        "[]",
        new URL("https://news.test/hook?token=test"),
        { token: "test" },
      ),
    ).toBe(true);
    expect(
      verifySendGridRequest(
        new Headers(),
        "[]",
        new URL("https://news.test/hook?token=no"),
        { token: "test" },
      ),
    ).toBe(false);
  });
  it("verifies real provider signatures and rejects modified payloads", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const key = publicKey
      .export({ format: "der", type: "spki" })
      .toString("base64");
    const timestamp = "1792166400",
      body = '[{"event":"delivered"}]';
    const signature = createSign("SHA256")
      .update(timestamp + body)
      .sign(privateKey)
      .toString("base64");
    const headers = new Headers({
      "x-twilio-email-event-webhook-signature": signature,
      "x-twilio-email-event-webhook-timestamp": timestamp,
    });
    expect(
      verifySendGridRequest(headers, body, new URL("https://news.test/hook"), {
        publicKey: key,
      }),
    ).toBe(true);
    expect(
      verifySendGridRequest(headers, "[]", new URL("https://news.test/hook"), {
        publicKey: key,
      }),
    ).toBe(false);
    expect(
      verifySendGridRequest(
        new Headers(),
        body,
        new URL("https://news.test/hook?token=test"),
        { publicKey: key, token: "test" },
      ),
    ).toBe(false);
  });
  it("binds unsubscribe links to an account and publication", () => {
    vi.stubEnv("NEWSLETTER_TOKEN_SECRET", "test-only-secret");
    const t = createNewsletterUnsubscribeToken("user-a", "tenant-a");
    expect(verifyNewsletterUnsubscribeToken(t)).toEqual({
      userId: "user-a",
      tenantId: "tenant-a",
    });
    expect(verifyNewsletterUnsubscribeToken(t + "x")).toBeNull();
    vi.unstubAllEnvs();
  });
  it("rejects expired and malformed cancellation links", () => {
    vi.stubEnv("SUPPORT_CANCEL_TOKEN_SECRET", "test-cancel-secret");
    const t = createSupportCancelToken(
      "sub_test",
      "user-test",
      "test@example.test",
    );
    expect(verifySupportCancelToken(t)?.sub).toBe("sub_test");
    expect(verifySupportCancelToken("invalid.signature")).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 91 * 86400000);
    expect(verifySupportCancelToken(t)).toBeNull();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
});
