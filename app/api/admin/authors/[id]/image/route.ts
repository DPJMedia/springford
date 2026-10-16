import { requireTenantAdmin } from "@/lib/api/requireTenantAdmin";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "author-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap (Supabase render endpoint handles big files OK,
                                    // but this saves bandwidth on the admin upload itself)
const ALLOWED_KINDS = new Set(["avatar", "cover"]);

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
  return { ok: true as const };
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tenant = await getTenantForApiRoute();
  const access = await requireTenantAdmin(tenant.id); if (!access.ok) return access.response;
  const db = createAdminClient();
  const { data: association, error: associationError } = await db.from("author_tenants").select("author_id").eq("author_id", id).eq("tenant_id", tenant.id).maybeSingle();
  if (associationError) return NextResponse.json({error:"Could not verify author access"},{status:503});
  if (!access.isSuperAdmin && !association) return NextResponse.json({error:"Forbidden"},{status:403});
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "avatar");

  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json(
      { error: "kind must be 'avatar' or 'cover'." },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 413 },
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${id}/${kind}-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  // Persist on the author row immediately so the form sees the result on save.
  const column = kind === "avatar" ? "avatar_url" : "cover_image_url";
  const { error: saveError } = await admin.from("authors").update({ [column]: url }).eq("id", id);
  if (saveError) return NextResponse.json({error:"Could not save author image"},{status:503});

  return NextResponse.json({ url, path });
}
