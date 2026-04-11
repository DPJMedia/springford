import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "editor"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id: tenantId, userId } = await params;

  let body: { role?: string };
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role === "admin" || body.role === "editor" ? body.role : null;
  if (!role) {
    return NextResponse.json({ error: "Role must be admin or editor." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile, error: profErr } = await admin
    .from("user_profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }
  if (profile?.is_super_admin) {
    return NextResponse.json(
      { error: "Super admin roles cannot be changed from tenant membership." },
      { status: 400 },
    );
  }

  const { data: updated, error } = await admin
    .from("tenant_memberships")
    .update({ role })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .in("role", [...STAFF_ROLES])
    .select("user_id, role")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, role: updated.role });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id: tenantId, userId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("tenant_memberships")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .in("role", ["admin", "editor"])
    .select("user_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
