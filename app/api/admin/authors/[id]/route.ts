import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { AuthorWithTenants } from "@/lib/types/database";
import { slugifyAuthorName } from "@/lib/authors/slug";

export const dynamic = "force-dynamic";

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

async function callerCanSeeAuthor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isSuperAdmin: boolean,
  authorId: string,
): Promise<boolean> {
  if (isSuperAdmin) return true;
  const { data } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .in("role", ["admin", "editor"]);
  const allowedTenantIds = (data ?? []).map((r: { tenant_id: string }) => r.tenant_id);
  if (allowedTenantIds.length === 0) return false;

  const admin = createAdminClient();
  const { data: pairs } = await admin
    .from("author_tenants")
    .select("tenant_id")
    .eq("author_id", authorId);
  return (pairs ?? []).some((r: { tenant_id: string }) =>
    allowedTenantIds.includes(r.tenant_id),
  );
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  if (!(await callerCanSeeAuthor(auth.supabase, auth.userId, auth.isSuperAdmin, id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: author, error } = await admin
    .from("authors")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data: tpairs } = await admin
    .from("author_tenants")
    .select("tenant_id")
    .eq("author_id", id);
  const result: AuthorWithTenants = {
    ...author,
    tenant_ids: (tpairs ?? []).map((r: { tenant_id: string }) => r.tenant_id),
  };
  return NextResponse.json({ author: result });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  if (!(await callerCanSeeAuthor(auth.supabase, auth.userId, auth.isSuperAdmin, id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    updates.name = n;
  }
  if (typeof body.slug === "string") {
    const s = slugifyAuthorName(body.slug);
    if (!s) return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
    updates.slug = s;
  }
  for (const key of [
    "title",
    "bio",
    "email",
    "avatar_url",
    "cover_image_url",
    "twitter_handle",
    "linkedin_url",
    "website_url",
  ] as const) {
    if (key in body) {
      const v = body[key];
      updates[key] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
  }
  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("authors").update(updates).eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Another author already uses that slug." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Tenant assignments are super-admin-only to prevent privilege escalation
  // (a tenant admin shouldn't be able to add an author to a tenant they
  // don't belong to).
  if (Array.isArray(body.tenant_ids)) {
    if (!auth.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can change tenant assignments." },
        { status: 403 },
      );
    }
    const tenantIds = (body.tenant_ids as unknown[]).map((x) => String(x));
    if (tenantIds.length === 0) {
      return NextResponse.json(
        { error: "Assign the author to at least one site." },
        { status: 400 },
      );
    }
    await admin.from("author_tenants").delete().eq("author_id", id);
    const { error: insErr } = await admin
      .from("author_tenants")
      .insert(tenantIds.map((tenant_id) => ({ author_id: id, tenant_id })));
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  const { data: refreshed } = await admin
    .from("authors")
    .select("*")
    .eq("id", id)
    .single();
  const { data: tpairs } = await admin
    .from("author_tenants")
    .select("tenant_id")
    .eq("author_id", id);
  return NextResponse.json({
    author: {
      ...refreshed,
      tenant_ids: (tpairs ?? []).map((r: { tenant_id: string }) => r.tenant_id),
    } as AuthorWithTenants,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can delete authors." },
      { status: 403 },
    );
  }
  const { id } = await ctx.params;
  const admin = createAdminClient();
  const { error } = await admin.from("authors").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
