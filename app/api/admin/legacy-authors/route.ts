import { NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/api/requireTenantAdmin";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET() {
  const tenant = await getTenantForApiRoute();
  const access = await requireTenantAdmin(tenant.id);
  if (!access.ok) return access.response;
  const db = createAdminClient();
  let query = db
    .from("user_profiles")
    .select("id,full_name,email,avatar_url,username,is_admin,is_super_admin")
    .order("full_name");
  if (access.isSuperAdmin)
    query = query.or("is_admin.eq.true,is_super_admin.eq.true");
  else {
    const { data, error } = await db
      .from("tenant_memberships")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .in("role", ["admin", "editor"]);
    if (error)
      return NextResponse.json(
        { error: "Could not load staff" },
        { status: 503 },
      );
    const ids = (data ?? []).map((x) => x.user_id);
    if (!ids.length) return NextResponse.json({ authors: [] });
    query = query.in("id", ids);
  }
  const { data, error } = await query;
  if (error)
    return NextResponse.json(
      { error: "Could not load staff" },
      { status: 503 },
    );
  return NextResponse.json({ authors: data ?? [] });
}
