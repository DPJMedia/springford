import type { SupabaseClient } from "@supabase/supabase-js";
export type Recipient = { email: string; name?: string; userId: string };
export const AUDIENCES = [
  "newsletter",
  "tenant_staff",
  "super_admins",
  "all_users",
] as const;
export type Audience = (typeof AUDIENCES)[number];
export function parseAudience(value: string): Audience {
  if (!AUDIENCES.includes(value as Audience))
    throw new Error("Unknown newsletter audience");
  return value as Audience;
}
async function pages<T>(
  run: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await run(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
export async function resolveRecipients(
  db: SupabaseClient,
  tenantId: string,
  audienceValue: string,
): Promise<Recipient[]> {
  const audience = parseAudience(audienceValue);
  let ids: string[] | undefined;
  if (audience === "newsletter" || audience === "tenant_staff") {
    const table =
      audience === "newsletter"
        ? "tenant_newsletter_subscriptions"
        : "tenant_memberships";
    const rows = await pages<{ user_id: string }>((from, to) => {
      let q = db
        .from(table)
        .select("user_id")
        .eq("tenant_id", tenantId)
        .order("user_id");
      q =
        audience === "newsletter"
          ? q.eq("subscribed", true)
          : q.in("role", ["admin", "editor"]);
      return q.range(from, to);
    });
    ids = [...new Set(rows.map((r) => r.user_id))];
  }
  type Profile = { id: string; email: string | null; full_name: string | null };
  let profiles: Profile[] = [];
  if (ids) {
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await db
        .from("user_profiles")
        .select("id,email,full_name")
        .in("id", ids.slice(i, i + 100));
      if (error) throw new Error(error.message);
      profiles.push(...(data ?? []));
    }
  } else {
    profiles = await pages<Profile>((from, to) => {
      let q = db
        .from("user_profiles")
        .select("id,email,full_name")
        .not("email", "is", null)
        .order("id");
      if (audience === "super_admins") q = q.eq("is_super_admin", true);
      return q.range(from, to);
    });
  }
  const unique = new Map<string, Recipient>();
  for (const p of profiles)
    if (p.email)
      unique.set(p.email.trim().toLowerCase(), {
        email: p.email.trim(),
        name: p.full_name || undefined,
        userId: p.id,
      });
  return [...unique.values()].sort((a, b) => a.email.localeCompare(b.email));
}
