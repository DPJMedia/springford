"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AuthorCard } from "@/components/admin/AuthorCard";
import type { AuthorWithTenants, TenantRow } from "@/lib/types/database";

export default function AuthorsAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [authors, setAuthors] = useState<AuthorWithTenants[]>([]);
  const [tenants, setTenants] = useState<Pick<TenantRow, "id" | "name" | "slug">[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const loadAuthors = useCallback(async () => {
    setError(null);
    const url = new URL("/api/admin/authors", window.location.origin);
    if (tenantFilter !== "all") url.searchParams.set("tenant_id", tenantFilter);
    const res = await fetch(url.toString(), { credentials: "include" });
    const j = await res.json();
    if (!res.ok) {
      setError(typeof j.error === "string" ? j.error : "Failed to load authors.");
      setAuthors([]);
      return;
    }
    setAuthors(Array.isArray(j.authors) ? j.authors : []);
  }, [tenantFilter]);

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

      // Load tenants for filter dropdown + tenant-name display in cards.
      const tres = await fetch("/api/admin/tenants", { credentials: "include" });
      const tj = await tres.json();
      if (tres.ok && Array.isArray(tj.tenants)) {
        setTenants(tj.tenants.map((t: TenantRow) => ({ id: t.id, name: t.name, slug: t.slug })));
      }

      await loadAuthors();
      setLoading(false);
    })();
  }, [router, supabase, loadAuthors]);

  useEffect(() => {
    if (!loading) void loadAuthors();
  }, [tenantFilter, loadAuthors, loading]);

  const tenantLookup = useMemo(() => {
    const m = new Map<string, { name: string; slug: string }>();
    for (const t of tenants) m.set(t.id, { name: t.name, slug: t.slug });
    return m;
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.title ?? "").toLowerCase().includes(q) ||
        (a.bio ?? "").toLowerCase().includes(q),
    );
  }, [authors, query]);

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
        title="Authors"
        description="Manage the bylines that appear on articles across your sites."
        actions={
          isSuperAdmin ? (
            <button
              type="button"
              onClick={() => router.push("/admin/authors/new")}
              className="rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              New author
            </button>
          ) : null
        }
      />
      <AdminPageLayout>
        {error && (
          <div className="mb-4 rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, title, or bio…"
              className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 pl-9 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
            />
            <svg
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
          >
            <option value="all">All sites</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="ml-auto text-xs text-[var(--admin-text-muted)] tabular-nums">
            {filtered.length} author{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-12 text-center">
            <p className="text-[var(--admin-text-muted)]">
              {authors.length === 0
                ? "No authors yet. Create your first author to start tagging articles."
                : "No authors match your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <AuthorCard key={a.id} author={a} tenants={tenantLookup} />
            ))}
          </div>
        )}
      </AdminPageLayout>
    </>
  );
}
