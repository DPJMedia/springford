import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { TenantRow } from "@/lib/types/database";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";

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

function parseSectionConfig(raw: unknown): { slug: string; label: string }[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const out: { slug: string; label: string }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const slug = String((row as Record<string, unknown>).slug ?? "").trim();
    const label = String((row as Record<string, unknown>).label ?? "").trim();
    if (!slug || !label || !SLUG_RE.test(slug)) return null;
    out.push({ slug, label });
  }
  return out;
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
  const section_config = parseSectionConfig(body.section_config);

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
  if (!section_config) {
    return NextResponse.json(
      { error: "Add at least one section with valid slug (lowercase, hyphens) and label." },
      { status: 400 },
    );
  }

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
