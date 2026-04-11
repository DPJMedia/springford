"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { TenantForm } from "@/components/admin/TenantForm";
import type { TenantRow } from "@/lib/types/database";

type AllMembersRow = {
  user_id: string;
  tenant_id: string;
  full_name: string | null;
  email: string;
  role: string;
  tenant_name: string;
  tenant_slug: string;
  created_at: string;
};

type MainTab = "tenants" | "members";
type SortKey = "tenant_name" | "role";

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-[var(--admin-accent)]"
      >
        {label}
        {active ? <span className="text-xs tabular-nums">{direction === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  );
}

export default function TenantsAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createdNotice, setCreatedNotice] = useState<{ domain: string; fromEmail: string } | null>(null);

  const [mainTab, setMainTab] = useState<MainTab>("tenants");
  const [allMembers, setAllMembers] = useState<AllMembersRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("tenant_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const loadTenants = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/admin/tenants", { credentials: "include" });
    const j = await res.json();
    if (!res.ok) {
      setLoadError(typeof j.error === "string" ? j.error : "Failed to load tenants.");
      setTenants([]);
      return;
    }
    setTenants(Array.isArray(j.tenants) ? j.tenants : []);
  }, []);

  const loadAllMembers = useCallback(async () => {
    setMembersError(null);
    setMembersLoading(true);
    try {
      const res = await fetch("/api/admin/tenants/members/all", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) {
        setMembersError(typeof j.error === "string" ? j.error : "Failed to load members.");
        setAllMembers([]);
        return;
      }
      setAllMembers(Array.isArray(j.rows) ? j.rows : []);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const sortedMembers = useMemo(() => {
    const rows = [...allMembers];
    const mult = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "tenant_name") {
        const c = a.tenant_name.localeCompare(b.tenant_name, undefined, { sensitivity: "base" });
        return c * mult;
      }
      const c = a.role.localeCompare(b.role, undefined, { sensitivity: "base" });
      return c * mult;
    });
    return rows;
  }, [allMembers, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
        router.replace("/admin");
        return;
      }
      setIsSuperAdmin(true);
      await loadTenants();
      setLoading(false);
    })();
  }, [router, supabase, loadTenants]);

  useEffect(() => {
    if (!isSuperAdmin || mainTab !== "members") return;
    void loadAllMembers();
  }, [isSuperAdmin, mainTab, loadAllMembers]);

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Tenants"
        description="Manage sites and staff access (super admin only)."
        actions={
          mainTab === "tenants" && !showCreate ? (
            <button
              type="button"
              onClick={() => {
                setCreatedNotice(null);
                setShowCreate(true);
              }}
              className="rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              New tenant
            </button>
          ) : null
        }
      />
      <AdminPageLayout>
        <div className="mb-6 flex gap-1 border-b border-[var(--admin-border)]">
          <button
            type="button"
            onClick={() => setMainTab("tenants")}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              mainTab === "tenants"
                ? "border-[var(--admin-accent)] text-[var(--admin-accent)]"
                : "border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            Tenants
          </button>
          <button
            type="button"
            onClick={() => setMainTab("members")}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              mainTab === "members"
                ? "border-[var(--admin-accent)] text-[var(--admin-accent)]"
                : "border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            Members
          </button>
        </div>

        {loadError && mainTab === "tenants" && (
          <div className="mb-4 rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {loadError}
          </div>
        )}

        {createdNotice && mainTab === "tenants" && (
          <div className="mb-6 rounded-lg border border-[var(--admin-accent)]/40 bg-[var(--admin-accent)]/10 p-4 text-sm text-[var(--admin-text)] leading-relaxed">
            <p className="m-0 font-semibold text-[var(--admin-accent)]">Tenant created.</p>
            <p className="mt-2 mb-0">To make this site live, complete these two steps:</p>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>
                Add <strong className="font-medium text-white">{createdNotice.domain}</strong> as a custom domain in
                the Vercel dashboard under this project&apos;s settings.
              </li>
              <li>
                Add a SendGrid sender identity for{" "}
                <strong className="font-medium text-white">{createdNotice.fromEmail}</strong> and verify DKIM/SPF DNS
                records for its domain.
              </li>
            </ol>
          </div>
        )}

        {mainTab === "tenants" && showCreate && (
          <div className="mb-8">
            <TenantForm
              mode="create"
              initial={null}
              onCancel={() => setShowCreate(false)}
              onCreated={(t) => {
                setShowCreate(false);
                setCreatedNotice({ domain: t.domain, fromEmail: t.from_email });
                void loadTenants();
              }}
              onUpdated={() => {}}
            />
          </div>
        )}

        {mainTab === "tenants" && (
          <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-table-header-bg)]">
                  <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Name</th>
                  <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Slug</th>
                  <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Domain</th>
                  <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">From email</th>
                  <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Active</th>
                  <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Created</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr
                    key={t.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/admin/tenants/${t.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/admin/tenants/${t.id}`);
                      }
                    }}
                    className="cursor-pointer border-b border-[var(--admin-border)] hover:bg-[var(--admin-table-row-hover)]"
                  >
                    <td className="px-3 py-2 text-[var(--admin-text)]">{t.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--admin-text-muted)]">{t.slug}</td>
                    <td className="px-3 py-2 text-[var(--admin-text-muted)]">{t.domain}</td>
                    <td className="px-3 py-2 text-[var(--admin-text-muted)]">{t.from_email}</td>
                    <td className="px-3 py-2 text-[var(--admin-text-muted)]">{t.is_active ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-[var(--admin-text-muted)] tabular-nums">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tenants.length === 0 && !loadError && (
              <p className="p-6 text-center text-sm text-[var(--admin-text-muted)]">No tenants yet.</p>
            )}
          </div>
        )}

        {mainTab === "members" && (
          <>
            <p className="mb-4 text-sm text-[var(--admin-text-muted)] m-0">
              Everyone with admin or editor access on any tenant. To add or remove someone, use the Tenants tab and
              open the site.
            </p>
            {membersError && (
              <div className="mb-4 rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {membersError}
              </div>
            )}
            {membersLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-table-header-bg)]">
                      <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Name</th>
                      <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Email</th>
                      <SortHeader
                        label="Role"
                        active={sortKey === "role"}
                        direction={sortDir}
                        onClick={() => toggleSort("role")}
                      />
                      <SortHeader
                        label="Tenant"
                        active={sortKey === "tenant_name"}
                        direction={sortDir}
                        onClick={() => toggleSort("tenant_name")}
                      />
                      <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Date added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMembers.map((r) => (
                      <tr
                        key={`${r.tenant_id}-${r.user_id}`}
                        className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-table-row-hover)]"
                      >
                        <td className="px-3 py-2 text-[var(--admin-text)]">{r.full_name || "—"}</td>
                        <td className="px-3 py-2 text-[var(--admin-text-muted)]">{r.email}</td>
                        <td className="px-3 py-2 text-[var(--admin-text-muted)] capitalize">{r.role}</td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/tenants/${r.tenant_id}`}
                            className="font-medium text-[var(--admin-accent)] hover:underline"
                          >
                            {r.tenant_name || r.tenant_slug}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-[var(--admin-text-muted)] tabular-nums">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedMembers.length === 0 && !membersError && (
                  <p className="p-6 text-center text-sm text-[var(--admin-text-muted)] m-0">
                    No admin or editor memberships yet.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </AdminPageLayout>
    </>
  );
}
