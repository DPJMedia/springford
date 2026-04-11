import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "editor"] as const;

type StaffRole = (typeof STAFF_ROLES)[number];

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id: tenantId } = await params;
  const admin = createAdminClient();

  const { data: memberships, error: mErr } = await admin
    .from("tenant_memberships")
    .select("user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .in("role", [...STAFF_ROLES]);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const rows = memberships ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ members: [] });
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles, error: pErr } = await admin
    .from("user_profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const members = rows.map((m) => {
    const p = byId.get(m.user_id);
    return {
      user_id: m.user_id,
      full_name: p?.full_name ?? null,
      email: p?.email ?? "",
      role: m.role as StaffRole,
      created_at: m.created_at,
    };
  });

  return NextResponse.json({ members });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id: tenantId } = await params;

  let body: { email?: string; role?: string };
  try {
    body = (await request.json()) as { email?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(emailRaw);
  const role = body.role === "admin" || body.role === "editor" ? body.role : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "Role must be admin or editor." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile, error: pErr } = await admin
    .from("user_profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json(
      {
        error:
          "No account found with that email. The user must have an account before being added.",
      },
      { status: 400 },
    );
  }

  const userId = profile.id;

  const { data: existing } = await admin
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This user already has access to this tenant." },
      { status: 409 },
    );
  }

  const { error: insErr } = await admin.from("tenant_memberships").insert({
    user_id: userId,
    tenant_id: tenantId,
    role,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "This user already has access to this tenant." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
