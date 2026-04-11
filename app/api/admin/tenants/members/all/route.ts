import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "editor"] as const;

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  const { data: memberships, error: mErr } = await admin
    .from("tenant_memberships")
    .select("user_id, tenant_id, role, created_at")
    .in("role", [...STAFF_ROLES]);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const rows = memberships ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [{ data: tenants, error: tErr }, { data: profiles, error: pErr }] = await Promise.all([
    admin.from("tenants").select("id, name, slug").in("id", tenantIds),
    admin.from("user_profiles").select("id, full_name, email").in("id", userIds),
  ]);

  if (tErr || pErr) {
    return NextResponse.json({ error: tErr?.message ?? pErr?.message ?? "Query failed" }, { status: 500 });
  }

  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const out = rows.map((m) => {
    const t = tenantById.get(m.tenant_id);
    const p = profileById.get(m.user_id);
    return {
      user_id: m.user_id,
      tenant_id: m.tenant_id,
      full_name: p?.full_name ?? null,
      email: p?.email ?? "",
      role: m.role,
      tenant_name: t?.name ?? "",
      tenant_slug: t?.slug ?? "",
      created_at: m.created_at,
    };
  });

  return NextResponse.json({ rows: out });
}
