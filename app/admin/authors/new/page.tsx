"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AuthorForm } from "@/components/admin/AuthorForm";
import { useTenant } from "@/lib/tenant/TenantProvider";
import type { TenantRow } from "@/lib/types/database";

export default function NewAuthorPage() {
  const router = useRouter();
  const supabase = createClient();
  const currentTenant = useTenant();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Pick<TenantRow, "id" | "name" | "slug">[]>([]);

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
        .select("is_super_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_super_admin) {
        router.replace("/admin/authors");
        return;
      }

      const tres = await fetch("/api/admin/tenants", { credentials: "include" });
      const tj = await tres.json();
      if (tres.ok && Array.isArray(tj.tenants)) {
        setTenants(
          tj.tenants.map((t: TenantRow) => ({ id: t.id, name: t.name, slug: t.slug })),
        );
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="New author"
        description="Create a byline that can be tagged on articles."
      />
      <AdminPageLayout>
        <AuthorForm
          mode="create"
          initial={{
            id: "",
            name: "",
            slug: "",
            title: null,
            bio: null,
            email: null,
            avatar_url: null,
            cover_image_url: null,
            twitter_handle: null,
            linkedin_url: null,
            website_url: null,
            is_active: true,
            created_at: "",
            updated_at: "",
            // Default-select the tenant the admin is currently viewing.
            tenant_ids: currentTenant?.id ? [currentTenant.id] : [],
          }}
          tenants={tenants}
          isSuperAdmin={true}
        />
      </AdminPageLayout>
    </>
  );
}
