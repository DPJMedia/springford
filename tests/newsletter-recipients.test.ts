import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAudience, resolveRecipients } from "../lib/newsletter/recipients";
function database(
  tables: Record<string, Record<string, unknown>[]>,
  fail = false,
) {
  return {
    from(table: string) {
      let rows = tables[table] ?? [];
      const q = {
        select() {
          return q;
        },
        eq(k: string, v: unknown) {
          rows = rows.filter((r) => r[k] === v);
          return q;
        },
        in(k: string, v: unknown[]) {
          rows = rows.filter((r) => v.includes(r[k]));
          return q;
        },
        not(k: string, _operator: string, v: unknown) {
          rows = rows.filter((r) => r[k] !== v);
          return q;
        },
        order() {
          return q;
        },
        range(a: number, b: number) {
          rows = rows.slice(a, b + 1);
          return q;
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(
            resolve({
              data: rows,
              error: fail ? { message: "Database unavailable" } : null,
            }),
          );
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}
describe("newsletter audiences", () => {
  const profiles = [
    {
      id: "one",
      email: "one@example.test",
      full_name: "One",
      is_super_admin: false,
    },
    {
      id: "two",
      email: "two@example.test",
      full_name: "Two",
      is_super_admin: false,
    },
    {
      id: "owner",
      email: "owner@example.test",
      full_name: "Owner",
      is_super_admin: true,
    },
  ];
  it("rejects unrecognized audience types instead of sending to everyone", () => {
    expect(() => parseAudience("tenant_staf")).toThrow(
      "Unknown newsletter audience",
    );
  });
  it("targets only staff of the requested publication", async () => {
    const db = database({
      user_profiles: profiles,
      tenant_memberships: [
        { tenant_id: "a", user_id: "one", role: "editor" },
        { tenant_id: "b", user_id: "two", role: "admin" },
      ],
    });
    expect(
      (await resolveRecipients(db, "a", "tenant_staff")).map((r) => r.email),
    ).toEqual(["one@example.test"]);
  });
  it("honors per-publication subscriptions and opt-outs", async () => {
    const db = database({
      user_profiles: profiles,
      tenant_newsletter_subscriptions: [
        { tenant_id: "a", user_id: "one", subscribed: false },
        { tenant_id: "b", user_id: "one", subscribed: true },
        { tenant_id: "a", user_id: "two", subscribed: true },
      ],
    });
    expect(
      (await resolveRecipients(db, "a", "newsletter")).map((r) => r.userId),
    ).toEqual(["two"]);
  });
  it("does not substitute all users when a staff audience is empty", async () => {
    expect(
      await resolveRecipients(
        database({ user_profiles: profiles }),
        "empty",
        "tenant_staff",
      ),
    ).toEqual([]);
  });
  it("fails before sending if recipient queries fail", async () => {
    await expect(
      resolveRecipients(database({}, true), "a", "newsletter"),
    ).rejects.toThrow("Database unavailable");
  });
  it("paginates beyond the API default without dropping subscribers", async () => {
    const people = Array.from({ length: 1101 }, (_, i) => ({
      id: `person-${i}`,
      email: `p${i}@example.test`,
      full_name: null,
    }));
    const subs = people.map((p) => ({
      user_id: p.id,
      tenant_id: "a",
      subscribed: true,
    }));
    expect(
      await resolveRecipients(
        database({
          user_profiles: people,
          tenant_newsletter_subscriptions: subs,
        }),
        "a",
        "newsletter",
      ),
    ).toHaveLength(1101);
  });
  it("deduplicates addresses without mixing publication membership", async () => {
    const p = [
      ...profiles,
      { id: "duplicate", email: "ONE@example.test", full_name: null },
    ];
    const subs = [
      { user_id: "one", tenant_id: "a", subscribed: true },
      { user_id: "duplicate", tenant_id: "a", subscribed: true },
    ];
    expect(
      await resolveRecipients(
        database({ user_profiles: p, tenant_newsletter_subscriptions: subs }),
        "a",
        "newsletter",
      ),
    ).toHaveLength(1);
  });
});
