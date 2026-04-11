import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Staff search without a tenant id — used when building a new tenant (draft members
 * before `tenant_id` exists). Same rules as `/api/admin/tenants/[id]/staff-search`
 * but no membership exclusions (caller filters already-picked users).
 */
export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const safe = q.replace(/[%_]/g, "").slice(0, 80);
  if (safe.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const pattern = `%${safe}%`;
  const admin = createAdminClient();

  const [{ data: byName, error: e1 }, { data: byEmail, error: e2 }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id, full_name, email, is_admin, is_super_admin")
      .ilike("full_name", pattern)
      .limit(40),
    admin
      .from("user_profiles")
      .select("id, full_name, email, is_admin, is_super_admin")
      .ilike("email", pattern)
      .limit(40),
  ]);

  if (e1 || e2) {
    return NextResponse.json({ error: e1?.message ?? e2?.message ?? "Query failed" }, { status: 500 });
  }

  const merged = new Map<string, { id: string; full_name: string | null; email: string }>();
  for (const row of [...(byName ?? []), ...(byEmail ?? [])]) {
    if (!row.is_admin && !row.is_super_admin) continue;
    merged.set(row.id, {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
    });
  }

  const users = [...merged.values()].slice(0, 20);
  return NextResponse.json({ users });
}
