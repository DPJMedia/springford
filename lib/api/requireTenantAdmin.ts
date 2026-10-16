import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Authorization must run on the server before any service-role query. */
export async function requireTenantAdmin(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (profileError)
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Could not verify access" },
        { status: 503 },
      ),
    };
  if (profile?.is_super_admin)
    return { ok: true as const, user, supabase, isSuperAdmin: true };
  const { data: membership, error: membershipError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (membershipError)
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Could not verify access" },
        { status: 503 },
      ),
    };
  if (!membership || !["admin", "editor"].includes(membership.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true as const, user, supabase, isSuperAdmin: false };
}
