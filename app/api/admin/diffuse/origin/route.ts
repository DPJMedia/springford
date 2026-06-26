/**
 * Returns the canonical origin URL for a Diffuse output, if it was already
 * imported on another Press tenant. Used at import time so cross-posted copies
 * declare the FIRST import as canonical (one original + pointers, no duplicate
 * content competing across the network).
 *
 * Service-role lookup (crosses tenants, which the caller's RLS-scoped client
 * cannot), gated to authenticated admins. Returns only a public article URL.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Auth: must be a signed-in admin (super admin or tenant admin/editor).
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

  const outputId = new URL(request.url).searchParams.get("outputId")?.trim();
  if (!outputId) return NextResponse.json({ canonicalUrl: null });

  const admin = createAdminClient();

  // Earliest import of this output across ALL tenants = the canonical original.
  const { data: imports } = await admin
    .from("diffuse_imported_articles")
    .select("article_id, tenant_id, imported_at")
    .eq("diffuse_output_id", outputId)
    .order("imported_at", { ascending: true })
    .limit(1);

  const origin = imports?.[0];
  if (!origin) return NextResponse.json({ canonicalUrl: null });

  const [{ data: article }, { data: tenant }] = await Promise.all([
    admin.from("articles").select("slug, canonical_url").eq("id", origin.article_id).maybeSingle(),
    admin.from("tenants").select("domain").eq("id", origin.tenant_id).maybeSingle(),
  ]);

  if (!article?.slug || !tenant?.domain) {
    return NextResponse.json({ canonicalUrl: null });
  }

  // If the origin is itself a syndicated copy, chase its canonical so every copy
  // points at the true original.
  const canonicalUrl =
    article.canonical_url ||
    `https://www.${tenant.domain.trim().toLowerCase()}/article/${article.slug}`;

  return NextResponse.json({ canonicalUrl });
}
