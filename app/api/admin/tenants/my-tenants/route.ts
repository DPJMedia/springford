import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: pErr } = await supabase
    .from("user_profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (pErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  const admin = createAdminClient();

  if (profile.is_super_admin) {
    const { data: tenants, error } = await admin
      .from("tenants")
      .select("id, name, slug, domain, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      is_super_admin: true,
      tenants: tenants ?? [],
    });
  }

  const { data: memberships, error: mErr } = await admin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .in("role", ["admin", "editor"]);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const ids = [...new Set((memberships ?? []).map((m) => m.tenant_id))];
  if (ids.length === 0) {
    return NextResponse.json({ is_super_admin: false, tenants: [] });
  }

  const { data: tenants, error: tErr } = await admin
    .from("tenants")
    .select("id, name, slug, domain, is_active")
    .in("id", ids)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  return NextResponse.json({
    is_super_admin: false,
    tenants: tenants ?? [],
  });
}
