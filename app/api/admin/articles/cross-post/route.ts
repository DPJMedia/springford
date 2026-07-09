/**
 * Cross-post an article to other Press tenants ("publish to several stations at once").
 *
 * Creates/updates a COPY of the source article on each selected tenant: same content,
 * its own tenant_id (so views/analytics stay separated per site), its own view counts,
 * and a canonical_url pointing back to the original so the network doesn't compete with
 * itself in search (one original + pointers).
 *
 * Service-role (writes across tenants, which the caller's RLS-scoped client can't) and
 * gated: the user must be a super admin, or an admin/editor of each target tenant.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Columns that must NOT be copied verbatim (identity / per-tenant / timestamps).
const OMIT = new Set([
  "id",
  "tenant_id",
  "created_at",
  "updated_at",
  "view_count",
  "share_count",
  "canonical_url",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin && !profile?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { sourceArticleId?: string; targetTenantIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sourceArticleId = body.sourceArticleId;
  const targetTenantIds = Array.isArray(body.targetTenantIds) ? body.targetTenantIds : [];
  if (!sourceArticleId || targetTenantIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const admin = createAdminClient();

  // Source article (all columns) + its tenant domain (for the canonical URL).
  const { data: src, error: srcErr } = await admin
    .from("articles")
    .select("*")
    .eq("id", sourceArticleId)
    .maybeSingle();
  if (srcErr || !src) {
    return NextResponse.json({ error: "Source article not found" }, { status: 404 });
  }

  const { data: srcTenant } = await admin
    .from("tenants")
    .select("domain")
    .eq("id", src.tenant_id)
    .maybeSingle();
  const srcDomain = (srcTenant?.domain || "").trim().toLowerCase();
  // If the source is itself a syndicated copy, keep pointing at the true original.
  const canonicalUrl =
    src.canonical_url || (srcDomain ? `https://www.${srcDomain}/article/${src.slug}` : null);

  // Which tenants may this user post to?
  let allowed: Set<string>;
  if (profile.is_super_admin) {
    const { data: all } = await admin.from("tenants").select("id").eq("is_active", true);
    allowed = new Set((all ?? []).map((t) => t.id));
  } else {
    const { data: memberships } = await admin
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .in("role", ["admin", "editor"]);
    allowed = new Set((memberships ?? []).map((m) => m.tenant_id));
  }

  // Build the content copy once (everything except identity/per-tenant fields).
  const base: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!OMIT.has(k)) base[k] = v;
  }
  base.author_id = user.id;
  base.updated_by = user.id;
  base.canonical_url = canonicalUrl;
  base.view_count = 0;
  base.share_count = 0;

  const results: { tenantId: string; status: string }[] = [];

  for (const targetTenantId of targetTenantIds) {
    if (targetTenantId === src.tenant_id) {
      results.push({ tenantId: targetTenantId, status: "skipped_source" });
      continue;
    }
    if (!allowed.has(targetTenantId)) {
      results.push({ tenantId: targetTenantId, status: "forbidden" });
      continue;
    }

    // Is there already an article on this tenant with the same slug?
    const { data: existing } = await admin
      .from("articles")
      .select("id, canonical_url")
      .eq("tenant_id", targetTenantId)
      .eq("slug", src.slug)
      .maybeSingle();

    // Only touch it if it's a prior cross-post of THIS source; never clobber an
    // unrelated article that happens to share the slug.
    if (existing && existing.canonical_url !== canonicalUrl) {
      results.push({ tenantId: targetTenantId, status: "skipped_slug_conflict" });
      continue;
    }

    const row = { ...base, tenant_id: targetTenantId };

    if (existing) {
      const { error } = await admin.from("articles").update(row).eq("id", existing.id);
      results.push({ tenantId: targetTenantId, status: error ? `error: ${error.message}` : "updated" });
    } else {
      const { error } = await admin.from("articles").insert(row);
      results.push({ tenantId: targetTenantId, status: error ? `error: ${error.message}` : "created" });
    }
  }

  return NextResponse.json({ results, canonicalUrl });
}
