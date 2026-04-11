"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { TenantForm } from "@/components/admin/TenantForm";
import {
  TenantDeleteConfirmModal,
  TenantDeleteHeaderButton,
} from "@/components/admin/TenantDeleteSection";
import { TenantMembersSection } from "@/components/admin/TenantMembersSection";
import type { TenantRow } from "@/lib/types/database";

export default function TenantDetailAdminPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const loadTenant = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    const res = await fetch(`/api/admin/tenants/${id}`, { credentials: "include" });
    const j = await res.json();
    if (!res.ok) {
      setLoadError(typeof j.error === "string" ? j.error : "Failed to load tenant.");
      setTenant(null);
      return;
    }
    setTenant(j.tenant as TenantRow);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
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
        router.replace("/admin");
        return;
      }
      if (!cancelled) setIsSuperAdmin(true);
      await loadTenant();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase, loadTenant]);

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  if (!tenant || loadError) {
    return (
      <>
        <AdminPageHeader
          title="Tenant"
          description="Super admin only."
          actions={
            <Link
              href="/admin/tenants"
              className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-header-bg)]"
            >
              Back to tenants
            </Link>
          }
        />
        <AdminPageLayout>
          <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {loadError ?? "Tenant not found."}
          </div>
        </AdminPageLayout>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={tenant.name}
        description={`${tenant.slug} · ${tenant.domain}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/tenants"
              className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-header-bg)]"
            >
              Back to tenants
            </Link>
            <TenantDeleteHeaderButton
              tenantSlug={tenant.slug}
              onOpen={() => setDeleteModalOpen(true)}
            />
          </div>
        }
      />
      <TenantDeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        tenantId={id}
        tenantSlug={tenant.slug}
      />
      <AdminPageLayout>
        <div className="space-y-8">
          <TenantForm
            mode="edit"
            initial={tenant}
            titleOverride="Tenant configuration"
            onCancel={() => router.push("/admin/tenants")}
            onCreated={() => {}}
            onUpdated={(t) => setTenant(t)}
          />
          <TenantMembersSection tenantId={id} />
        </div>
      </AdminPageLayout>
    </>
  );
}
