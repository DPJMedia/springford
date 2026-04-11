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
  is_super_admin?: boolean;
  tenant_name: string;
  tenant_slug: string;
  created_at: string;
};

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

function memberRoleDisplay(m: AllMembersRow): string {
  if (m.is_super_admin) return "Super Admin";
  if (m.role === "admin") return "Admin";
  if (m.role === "editor") return "Editor";
  return m.role;
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
      const c = memberRoleDisplay(a).localeCompare(memberRoleDisplay(b), undefined, { sensitivity: "base" });
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
      await loadAllMembers();
      setLoading(false);
    })();
  }, [router, supabase, loadTenants, loadAllMembers]);

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
          !showCreate ? (
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
        <section className="mb-10">
          <h2 className="m-0 border-b border-[var(--admin-border)] pb-3 text-lg font-semibold text-[var(--admin-text)]">
            Tenants
          </h2>

          {loadError && (
            <div className="mt-4 rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {loadError}
            </div>
          )}

          {createdNotice && (
            <div className="mt-6 rounded-lg border border-[var(--admin-accent)]/40 bg-[var(--admin-accent)]/10 p-4 text-sm text-[var(--admin-text)] leading-relaxed">
              <p className="m-0 font-semibold text-[var(--admin-accent)]">Tenant created.</p>
              <p className="mt-2 mb-0">To make this site live, complete these steps:</p>
              <ol className="mt-2 list-decimal pl-5 space-y-2">
                <li>
                  Add <strong className="font-medium text-white">{createdNotice.domain}</strong> as a custom domain in
                  the Vercel dashboard under this project&apos;s settings.
                </li>
                <li>
                  In the <strong className="font-medium text-white">Supabase</strong> dashboard, open{" "}
                  <strong className="font-medium text-white">Authentication</strong> →{" "}
                  <strong className="font-medium text-white">URL Configuration</strong> and register this tenant&apos;s
                  URLs: set <strong className="font-medium text-white">Site URL</strong> to your canonical site address
                  (for example{" "}
                  <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                    https://www.{createdNotice.domain}
                  </code>
                  ), and add the same origin plus{" "}
                  <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                    /auth/callback
                  </code>{" "}
                  to <strong className="font-medium text-white">Redirect URLs</strong> so sign-in and OAuth return to
                  this domain.
                </li>
                <li>
                  Add a SendGrid sender identity for{" "}
                  <strong className="font-medium text-white">{createdNotice.fromEmail}</strong> and verify DKIM/SPF DNS
                  records for its domain.
                </li>
              </ol>
            </div>
          )}

          {showCreate && (
            <div className="mt-6 mb-8">
              <TenantForm
                mode="create"
                initial={null}
                onCancel={() => setShowCreate(false)}
                onCreated={(t) => {
                  setShowCreate(false);
                  setCreatedNotice({ domain: t.domain, fromEmail: t.from_email });
                  void loadTenants();
                  void loadAllMembers();
                }}
                onUpdated={() => {}}
              />
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--admin-border)]">
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
        </section>

        <div className="border-t border-[var(--admin-border)] pt-10" />

        <section>
          <h2 className="m-0 border-b border-[var(--admin-border)] pb-3 text-lg font-semibold text-[var(--admin-text)]">
            Members
          </h2>
          <p className="mt-3 mb-4 text-sm text-[var(--admin-text-muted)] m-0">
            Everyone with admin or editor access on any tenant. To add or remove someone, open the site from the table
            above.
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
                      <td className="px-3 py-2">
                        <span
                          className={
                            r.is_super_admin
                              ? "inline-block rounded border border-violet-500/40 bg-violet-950/50 px-2 py-0.5 text-xs font-semibold text-violet-200"
                              : "text-[var(--admin-text-muted)]"
                          }
                        >
                          {memberRoleDisplay(r)}
                        </span>
                      </td>
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
        </section>
      </AdminPageLayout>
    </>
  );
}
