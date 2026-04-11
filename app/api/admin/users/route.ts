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
    .select("user_id, tenant_id")
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

  const namesByUser = new Map<string, string[]>();
  for (const s of subs ?? []) {
    const name = nameByTenant.get(s.tenant_id);
    if (!name) continue;
    const arr = namesByUser.get(s.user_id) ?? [];
    if (!arr.includes(name)) arr.push(name);
    namesByUser.set(s.user_id, arr);
  }

  const users = list.map((p) => ({
    ...p,
    newsletter_tenant_names: (namesByUser.get(p.id) ?? []).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    ),
  }));

  return NextResponse.json({ users });
}
