import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Super admins search staff (admin or super admin on profile) to add to a tenant; excludes existing members. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id: tenantId } = await params;
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const safe = q.replace(/[%_]/g, "").slice(0, 80);
  if (safe.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const pattern = `%${safe}%`;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", tenantId);
  const exclude = new Set((existing ?? []).map((r) => r.user_id));

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
    if (exclude.has(row.id)) continue;
    merged.set(row.id, {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
    });
  }

  const users = [...merged.values()].slice(0, 20);
  return NextResponse.json({ users });
}
