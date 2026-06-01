import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { AuthorWithTenants } from "@/lib/types/database";
import { slugifyAuthorName } from "@/lib/authors/slug";

export const dynamic = "force-dynamic";

/**
 * Returns { ok: true, supabase, isSuperAdmin, userId } or a 401/403 response.
 * Used to gate both GET (list) and POST (create).
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin, is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin && !profile?.is_super_admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return {
    ok: true as const,
    supabase,
    userId: user.id,
    isSuperAdmin: !!profile.is_super_admin,
  };
}

/**
 * Tenant ids the caller has admin/editor access to. Super admins get all
 * active tenant ids.
 */
async function callerTenantIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isSuperAdmin: boolean,
): Promise<string[]> {
  if (isSuperAdmin) {
    const admin = createAdminClient();
    const { data } = await admin.from("tenants").select("id");
    return (data ?? []).map((r: { id: string }) => r.id);
  }
  const { data } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .in("role", ["admin", "editor"]);
  return (data ?? []).map((r: { tenant_id: string }) => r.tenant_id);
}

/**
 * GET — list authors. Optional `?tenant_id=<uuid>` filter (must be a tenant
 * the caller has access to). Without the filter, returns every author the
 * caller can see across all their tenants.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get("tenant_id");

  const allowed = await callerTenantIds(auth.supabase, auth.userId, auth.isSuperAdmin);
  if (allowed.length === 0) {
    return NextResponse.json({ authors: [] });
  }
  if (requestedTenantId && !allowed.includes(requestedTenantId)) {
    return NextResponse.json({ error: "Forbidden tenant." }, { status: 403 });
  }
  const tenantFilter = requestedTenantId ? [requestedTenantId] : allowed;

  const admin = createAdminClient();

  // Get author ids that belong to at least one of the tenants the caller can see.
  const { data: pairs, error: pairsErr } = await admin
    .from("author_tenants")
    .select("author_id, tenant_id")
    .in("tenant_id", tenantFilter);
  if (pairsErr) {
    return NextResponse.json({ error: pairsErr.message }, { status: 500 });
  }

  const idToTenants = new Map<string, string[]>();
  for (const row of pairs ?? []) {
    const list = idToTenants.get(row.author_id) ?? [];
    list.push(row.tenant_id);
    idToTenants.set(row.author_id, list);
  }
  const ids = Array.from(idToTenants.keys());
  if (ids.length === 0) {
    return NextResponse.json({ authors: [] });
  }

  const { data: authors, error } = await admin
    .from("authors")
    .select("*")
    .in("id", ids)
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched: AuthorWithTenants[] = (authors ?? []).map((a: any) => ({
    ...a,
    tenant_ids: idToTenants.get(a.id) ?? [],
  }));
  return NextResponse.json({ authors: enriched });
}

/**
 * POST — create an author. Super admins only (matches the "Super admins
 * can create author pages" requirement from the spec).
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can create authors." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const slugInput = String(body.slug ?? "").trim();
  const slug = slugifyAuthorName(slugInput || name);
  if (!slug) {
    return NextResponse.json({ error: "Could not derive a slug from the name." }, { status: 400 });
  }
  const tenantIds = Array.isArray(body.tenant_ids)
    ? (body.tenant_ids as unknown[]).map((x) => String(x))
    : [];
  if (tenantIds.length === 0) {
    return NextResponse.json(
      { error: "Assign the author to at least one site." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Uniqueness check (also enforced by UNIQUE constraint, but we want a clean message).
  const { data: existing } = await admin
    .from("authors")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `An author with slug "${slug}" already exists.` },
      { status: 409 },
    );
  }

  const insertRow = {
    name,
    slug,
    title: stringOrNull(body.title),
    bio: stringOrNull(body.bio),
    email: stringOrNull(body.email),
    avatar_url: stringOrNull(body.avatar_url),
    cover_image_url: stringOrNull(body.cover_image_url),
    twitter_handle: stringOrNull(body.twitter_handle),
    linkedin_url: stringOrNull(body.linkedin_url),
    website_url: stringOrNull(body.website_url),
    is_active: body.is_active !== false,
  };

  const { data: created, error } = await admin
    .from("authors")
    .insert(insertRow)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const joinRows = tenantIds.map((tenant_id) => ({
    author_id: created.id,
    tenant_id,
  }));
  const { error: joinErr } = await admin.from("author_tenants").insert(joinRows);
  if (joinErr) {
    // Roll back author insert so the table doesn't have an orphan.
    await admin.from("authors").delete().eq("id", created.id);
    return NextResponse.json({ error: joinErr.message }, { status: 500 });
  }

  return NextResponse.json({
    author: { ...created, tenant_ids: tenantIds } as AuthorWithTenants,
  });
}

function stringOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}
