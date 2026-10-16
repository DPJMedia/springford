import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRow } from "@/lib/types/database";
import { deliverCampaign } from "@/lib/newsletter/deliverCampaign";
vi.mock("@/lib/newsletter/buildEmailHtml", () => ({
  buildEmailHtml: () => "<p>Test __PRESS_UNSUBSCRIBE_URL__</p>",
  newsletterBrandingFromTenant: () => ({}),
}));
vi.mock("@/lib/newsletter/enrichArticleBlocksForEmail", () => ({
  enrichArticleBlocksWithAdvertisementFlags: async (
    _db: unknown,
    blocks: unknown,
  ) => blocks,
}));
vi.mock("@/lib/newsletter/unsubscribeToken", () => ({
  createNewsletterUnsubscribeToken: (user: string) => `signed-${user}`,
}));
const tenant = {
  id: "tenant-a",
  domain: "news.example.test",
  name: "Test News",
  slug: "test",
  section_config: [],
} as unknown as TenantRow;
const campaign = {
  id: "campaign-a",
  tenant_id: tenant.id,
  status: "draft",
  blocks: [],
  subject: "Test issue",
};
type Row = Record<string, unknown>;
function database(statuses: string[]) {
  const tables: Record<string, Row[]> = {
    newsletter_campaigns: [{ ...campaign }],
    newsletter_send_batches: statuses.map((status, i) => ({
      campaign_id: campaign.id,
      batch_index: i,
      status,
      recipients: [{ email: `reader${i}@example.test`, userId: `user-${i}` }],
    })),
  };
  const db = {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let patch: Row | undefined;
      let inserted: Row[] | undefined;
      const q = {
        select() {
          return q;
        },
        update(values: Row) {
          patch = values;
          return q;
        },
        insert(rows: Row[]) {
          inserted = rows;
          return q;
        },
        eq(k: string, v: unknown) {
          filters.push((r) => r[k] === v);
          return q;
        },
        in(k: string, v: unknown[]) {
          filters.push((r) => v.includes(r[k]));
          return q;
        },
        order() {
          return q;
        },
        then(resolve: (value: unknown) => unknown) {
          if (inserted) (tables[table] ??= []).push(...inserted);
          const rows = (tables[table] ?? []).filter((r) =>
            filters.every((f) => f(r)),
          );
          if (patch) rows.forEach((r) => Object.assign(r, patch));
          return Promise.resolve(
            resolve({ data: rows.map((r) => ({ ...r })), error: null }),
          );
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, tables };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("newsletter delivery checkpoints", () => {
  it("does not resend accepted batches when the remaining batch is retried", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "test-only");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetcher);
    const { db, tables } = database(["sent", "pending"]);
    expect(await deliverCampaign(db, campaign, tenant, false)).toEqual({
      recipientCount: 2,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(tables.newsletter_send_batches.map((r) => r.status)).toEqual([
      "sent",
      "sent",
    ]);
    expect(tables.newsletter_campaigns[0].status).toBe("sent");
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.personalizations[0].to).toEqual([
      { email: "reader1@example.test" },
    ]);
    expect(body.personalizations[0].headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });
  it("allows retry of a confirmed rejection while retaining earlier checkpoints", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "test-only");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetcher);
    const { db, tables } = database(["sent", "pending"]);
    await expect(deliverCampaign(db, campaign, tenant, false)).rejects.toThrow(
      "rejected batch (429)",
    );
    expect(tables.newsletter_campaigns[0].status).toBe("draft");
    expect(tables.newsletter_send_batches.map((r) => r.status)).toEqual([
      "sent",
      "failed",
    ]);
    await deliverCampaign(db, campaign, tenant, false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("holds an ambiguous provider timeout for review instead of sending twice", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "test-only");
    const fetcher = vi.fn().mockRejectedValue(new Error("Network timeout"));
    vi.stubGlobal("fetch", fetcher);
    const { db, tables } = database(["pending"]);
    await expect(deliverCampaign(db, campaign, tenant, false)).rejects.toThrow(
      "Network timeout",
    );
    expect(tables.newsletter_send_batches[0].status).toBe("uncertain");
    expect(tables.newsletter_campaigns[0].status).toBe("sending");
    await expect(deliverCampaign(db, campaign, tenant, false)).rejects.toThrow(
      "already sending",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects a second caller while a campaign is already claimed", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "test-only");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetcher);
    const { db, tables } = database(["pending"]);
    tables.newsletter_campaigns[0].status = "sending";
    await expect(deliverCampaign(db, campaign, tenant, false)).rejects.toThrow(
      "already sending",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
