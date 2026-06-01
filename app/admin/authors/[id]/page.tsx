"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AuthorForm } from "@/components/admin/AuthorForm";
import type { AuthorWithTenants, TenantRow } from "@/lib/types/database";

export default function EditAuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created") === "1";
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState<AuthorWithTenants | null>(null);
  const [tenants, setTenants] = useState<Pick<TenantRow, "id" | "name" | "slug">[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin, is_super_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin && !profile?.is_super_admin) {
        router.replace("/admin");
        return;
      }
      setIsSuperAdmin(!!profile.is_super_admin);

      const [aRes, tRes] = await Promise.all([
        fetch(`/api/admin/authors/${id}`, { credentials: "include" }),
        fetch("/api/admin/tenants", { credentials: "include" }),
      ]);
      const aJ = await aRes.json();
      if (!aRes.ok) {
        setError(typeof aJ.error === "string" ? aJ.error : "Failed to load author.");
        setLoading(false);
        return;
      }
      setAuthor(aJ.author as AuthorWithTenants);
      const tJ = await tRes.json();
      if (tRes.ok && Array.isArray(tJ.tenants)) {
        setTenants(
          tJ.tenants.map((t: TenantRow) => ({ id: t.id, name: t.name, slug: t.slug })),
        );
      }
      setLoading(false);
    })();
  }, [id, router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  if (error || !author) {
    return (
      <>
        <AdminPageHeader title="Author" />
        <AdminPageLayout>
          <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error ?? "Author not found."}
          </div>
        </AdminPageLayout>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title={author.name} description="Edit author profile" />
      <AdminPageLayout>
        {justCreated && (
          <div className="mb-4 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
            Author created. You can now upload a profile picture and thumbnail card image below.
          </div>
        )}
        <AuthorForm
          mode="edit"
          initial={author}
          tenants={tenants}
          isSuperAdmin={isSuperAdmin}
        />
      </AdminPageLayout>
    </>
  );
}
