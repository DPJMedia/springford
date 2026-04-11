import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { TenantRow } from "@/lib/types/database";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { PROTECTED_TENANT_SLUG } from "@/lib/tenant/protectedTenant";
import {
  serializeSectionConfigForDb,
  validateSectionsForApi,
} from "@/lib/tenant/sectionConfigStorage";

export const dynamic = "force-dynamic";

function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https:\/\//, "").replace(/^http:\/\//, "");
  s = s.replace(/^www\./, "");
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("id, name, slug, domain, from_email, from_name, section_config, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  return NextResponse.json({ tenant: data as TenantRow });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const domain = normalizeDomain(String(body.domain ?? ""));
  const from_email = String(body.from_email ?? "").trim();
  const from_name = String(body.from_name ?? "").trim();
  const is_active = typeof body.is_active === "boolean" ? body.is_active : true;
  const sections = validateSectionsForApi(body.section_config);
  const facebookRaw = typeof body.facebook_url === "string" ? body.facebook_url.trim() : "";
  const facebook_url = facebookRaw || null;

  if (!name) {
    return NextResponse.json({ error: "Site name is required." }, { status: 400 });
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
    .update({
      name,
      domain,
      from_email,
      from_name,
      section_config,
      is_active,
    })
    .eq("id", id)
    .select("id, name, slug, domain, from_email, from_name, section_config, is_active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Another tenant already uses this domain." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tenant: data as TenantRow });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: row, error: fetchErr } = await admin
    .from("tenants")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (row.slug === PROTECTED_TENANT_SLUG) {
    return NextResponse.json(
      { error: "The Spring-Ford Press tenant cannot be deleted." },
      { status: 403 },
    );
  }

  const { error: rpcErr } = await admin.rpc("delete_tenant_fully", { p_tenant_id: id });

  if (rpcErr) {
    const msg = rpcErr.message || "";
    if (msg.includes("Spring-Ford") || msg.includes("spring-ford")) {
      return NextResponse.json(
        { error: "The Spring-Ford Press tenant cannot be deleted." },
        { status: 403 },
      );
    }
    if (msg.includes("Tenant not found")) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg || "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
