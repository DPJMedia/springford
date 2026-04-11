import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { TenantRow } from "@/lib/types/database";
import {
  serializeSectionConfigForDb,
  validateSectionsForApi,
} from "@/lib/tenant/sectionConfigStorage";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https:\/\//, "").replace(/^http:\/\//, "");
  s = s.replace(/^www\./, "");
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_super_admin) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, supabase };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("id, name, slug, domain, from_email, from_name, section_config, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tenants: data as TenantRow[] });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const domain = normalizeDomain(String(body.domain ?? ""));
  const from_email = String(body.from_email ?? "").trim();
  const from_name = String(body.from_name ?? "").trim();
  const is_active = body.is_active !== false;
  const sections = validateSectionsForApi(body.section_config);
  const facebookRaw = typeof body.facebook_url === "string" ? body.facebook_url.trim() : "";
  const facebook_url = facebookRaw || null;

  if (!name) {
    return NextResponse.json({ error: "Site name is required." }, { status: 400 });
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, numbers, and hyphens only." },
      { status: 400 },
    );
  }
  if (!domain) {
    return NextResponse.json({ error: "Domain is required." }, { status: 400 });
  }
  if (!from_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
    return NextResponse.json({ error: "A valid from email is required." }, { status: 400 });
  }
  if (!from_name) {
    return NextResponse.json({ error: "From name is required." }, { status: 400 });
  }
  if (!sections) {
    return NextResponse.json(
      { error: "Add at least one section with valid slug (lowercase, hyphens) and label." },
      { status: 400 },
    );
  }

  const section_config = serializeSectionConfigForDb(sections, facebook_url);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .insert({
      name,
      slug,
      domain,
      from_email,
      from_name,
      section_config,
      is_active,
    })
    .select("id, name, slug, domain, from_email, from_name, section_config, is_active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A tenant with this slug or domain already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tenantId = data.id as string;
  const { data: superAdmins, error: saErr } = await admin
    .from("user_profiles")
    .select("id")
    .eq("is_super_admin", true);

  if (saErr) {
    return NextResponse.json(
      { error: `Tenant created but could not load super admins for membership: ${saErr.message}` },
      { status: 500 },
    );
  }

  const membershipRows = (superAdmins ?? []).map((r) => ({
    tenant_id: tenantId,
    user_id: r.id,
    role: "admin" as const,
  }));

  if (membershipRows.length > 0) {
    const { error: memErr } = await admin.from("tenant_memberships").insert(membershipRows);
    if (memErr) {
      return NextResponse.json(
        { error: `Tenant created but super admin memberships failed: ${memErr.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ tenant: data });
}
