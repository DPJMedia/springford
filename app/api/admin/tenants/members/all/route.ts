import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "editor"] as const;

/**
 * Cross-tenant membership overview for the tenants list page.
 * Only **platform super admins** are listed here so the table is not flooded with
 * every per-tenant editor/admin. Per-site staff are managed on each tenant’s detail page.
 */
export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  const { data: superProfiles, error: saErr } = await admin
    .from("user_profiles")
    .select("id, full_name, email, is_super_admin")
    .eq("is_super_admin", true);

  if (saErr) {
    return NextResponse.json({ error: saErr.message }, { status: 500 });
  }

  const superIds = (superProfiles ?? []).map((p) => p.id);
  if (superIds.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const { data: memberships, error: mErr } = await admin
    .from("tenant_memberships")
    .select("user_id, tenant_id, role, created_at")
    .in("role", [...STAFF_ROLES])
    .in("user_id", superIds);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const rows = memberships ?? [];

  type MembershipRow = {
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    role: string;
    created_at: string;
  };

  type Grouped = {
    user_id: string;
    full_name: string | null;
    email: string;
    is_super_admin: boolean;
    memberships: MembershipRow[];
  };

  const grouped = new Map<string, Grouped>();

  for (const p of superProfiles ?? []) {
    grouped.set(p.id, {
      user_id: p.id,
      full_name: p.full_name ?? null,
      email: p.email ?? "",
      is_super_admin: true,
      memberships: [],
    });
  }

  if (rows.length > 0) {
    const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
    const { data: tenants, error: tErr } = await admin
      .from("tenants")
      .select("id, name, slug")
      .in("id", tenantIds);

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));

    for (const m of rows) {
      const g = grouped.get(m.user_id);
      if (!g) continue;
      const t = tenantById.get(m.tenant_id);
      g.memberships.push({
        tenant_id: m.tenant_id,
        tenant_name: t?.name ?? "",
        tenant_slug: t?.slug ?? "",
        role: m.role,
        created_at: m.created_at,
      });
    }
  }

  const out = [...grouped.values()].map((u) => ({
    ...u,
    memberships: [...u.memberships].sort((a, b) =>
      a.tenant_name.localeCompare(b.tenant_name, undefined, { sensitivity: "base" }),
    ),
  }));

  out.sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: "base" }));

  return NextResponse.json({ rows: out });
}
