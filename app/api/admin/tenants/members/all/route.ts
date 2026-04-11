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
    admin.from("user_profiles").select("id, full_name, email, is_super_admin").in("id", userIds),
  ]);

  if (tErr || pErr) {
    return NextResponse.json({ error: tErr?.message ?? pErr?.message ?? "Query failed" }, { status: 500 });
  }

  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  type Grouped = {
    user_id: string;
    full_name: string | null;
    email: string;
    is_super_admin: boolean;
    memberships: Array<{
      tenant_id: string;
      tenant_name: string;
      tenant_slug: string;
      role: string;
      created_at: string;
    }>;
  };

  const grouped = new Map<string, Grouped>();

  for (const m of rows) {
    const t = tenantById.get(m.tenant_id);
    const p = profileById.get(m.user_id);
    let g = grouped.get(m.user_id);
    if (!g) {
      g = {
        user_id: m.user_id,
        full_name: p?.full_name ?? null,
        email: p?.email ?? "",
        is_super_admin: Boolean(p?.is_super_admin),
        memberships: [],
      };
      grouped.set(m.user_id, g);
    }
    if (p) {
      g.full_name = p.full_name ?? null;
      g.email = p.email ?? "";
      g.is_super_admin = Boolean(p.is_super_admin);
    }
    g.memberships.push({
      tenant_id: m.tenant_id,
      tenant_name: t?.name ?? "",
      tenant_slug: t?.slug ?? "",
      role: m.role,
      created_at: m.created_at,
    });
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
