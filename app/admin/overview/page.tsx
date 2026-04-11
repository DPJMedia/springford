"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";

export default function AdminOverviewPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_super_admin) {
        router.replace("/admin");
        return;
      }
      setOk(true);
    })();
  }, [router, supabase]);

  if (!ok) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="All Sites Overview"
        description="Cross-tenant analytics and stats (super admin)."
      />
      <AdminPageLayout>
        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-8 text-center">
          <p className="m-0 text-lg font-semibold text-[var(--admin-text)]">
            All Sites Overview — coming soon
          </p>
          <p className="mt-2 m-0 text-sm text-[var(--admin-text-muted)]">
            Combined metrics across every tenant will appear here.
          </p>
        </div>
      </AdminPageLayout>
    </>
  );
}
