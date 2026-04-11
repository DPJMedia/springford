import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  const { data: profiles, error: pErr } = await admin
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const list = profiles ?? [];
  if (list.length === 0) {
    return NextResponse.json({ users: [] });
  }

  const userIds = list.map((p) => p.id);

  const { data: subs, error: sErr } = await admin
    .from("tenant_newsletter_subscriptions")
    .select("user_id, tenant_id, subscribed_at")
    .eq("subscribed", true)
    .in("user_id", userIds);

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  const tenantIds = [...new Set((subs ?? []).map((s) => s.tenant_id).filter(Boolean))];
  let nameByTenant = new Map<string, string>();
  if (tenantIds.length > 0) {
    const { data: tenants, error: tErr } = await admin.from("tenants").select("id, name").in("id", tenantIds);
    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }
    nameByTenant = new Map((tenants ?? []).map((t) => [t.id, t.name]));
  }

  type SubRow = { tenant_name: string; subscribed_at: string | null };
  const subsByUser = new Map<string, SubRow[]>();
  for (const s of subs ?? []) {
    const tenantName = nameByTenant.get(s.tenant_id as string);
    if (!tenantName) continue;
    const row: SubRow = {
      tenant_name: tenantName,
      subscribed_at: (s.subscribed_at as string | null) ?? null,
    };
    const arr = subsByUser.get(s.user_id as string) ?? [];
    arr.push(row);
    subsByUser.set(s.user_id as string, arr);
  }
  for (const [uid, rows] of subsByUser) {
    rows.sort((a, b) =>
      a.tenant_name.localeCompare(b.tenant_name, undefined, { sensitivity: "base" }),
    );
    subsByUser.set(uid, rows);
  }

  const users = list.map((p) => {
    const newsletter_subscriptions = subsByUser.get(p.id) ?? [];
    const newsletter_tenant_names = newsletter_subscriptions.map((x) => x.tenant_name);
    return {
      ...p,
      newsletter_subscriptions,
      newsletter_tenant_names,
    };
  });

  return NextResponse.json({ users });
}
