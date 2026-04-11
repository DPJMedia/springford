"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { tenantPublicOrigin } from "@/lib/tenant/publicSiteUrl";

type TenantOverviewRow = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  is_active: boolean | null;
  articleCount: number;
  publishedArticleCount: number;
  pageViewCount: number;
  adCount: number;
  newsletterCampaignCount: number;
};

type Totals = {
  articleCount: number;
  publishedArticleCount: number;
  pageViewCount: number;
  adCount: number;
  newsletterCampaignCount: number;
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ok, setOk] = useState(false);
  const [rows, setRows] = useState<TenantOverviewRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

      const res = await fetch("/api/admin/overview/summary", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) {
        setLoadError(typeof j.error === "string" ? j.error : "Failed to load overview.");
        return;
      }
      setRows(Array.isArray(j.tenants) ? j.tenants : []);
      setTotals(j.totals ?? null);
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
        title="All sites"
        description="Roll-up counts across every tenant. Use the Site dropdown to open a site’s admin for tenant-scoped analytics, articles, and ads."
      />
      <AdminPageLayout>
        {loadError && (
          <div className="mb-4 rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {loadError}
          </div>
        )}

        {totals && (
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Articles (all)
              </p>
              <p className="mt-1 m-0 text-2xl font-semibold tabular-nums text-[var(--admin-text)]">
                {totals.articleCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Published
              </p>
              <p className="mt-1 m-0 text-2xl font-semibold tabular-nums text-[var(--admin-text)]">
                {totals.publishedArticleCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Page views
              </p>
              <p className="mt-1 m-0 text-2xl font-semibold tabular-nums text-[var(--admin-text)]">
                {totals.pageViewCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Ads
              </p>
              <p className="mt-1 m-0 text-2xl font-semibold tabular-nums text-[var(--admin-text)]">
                {totals.adCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Newsletter campaigns
              </p>
              <p className="mt-1 m-0 text-2xl font-semibold tabular-nums text-[var(--admin-text)]">
                {totals.newsletterCampaignCount.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-table-header-bg)]">
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Site</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Domain</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Articles</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Published</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Page views</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Ads</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Campaigns</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-table-row-hover)]"
                >
                  <td className="px-3 py-2 font-medium text-[var(--admin-text)]">
                    {r.name}
                    {r.is_active === false ? (
                      <span className="ml-2 text-xs font-normal text-[var(--admin-text-muted)]">(inactive)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-text-muted)]">{r.domain}</td>
                  <td className="px-3 py-2 tabular-nums text-[var(--admin-text-muted)]">{r.articleCount}</td>
                  <td className="px-3 py-2 tabular-nums text-[var(--admin-text-muted)]">
                    {r.publishedArticleCount}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--admin-text-muted)]">{r.pageViewCount}</td>
                  <td className="px-3 py-2 tabular-nums text-[var(--admin-text-muted)]">{r.adCount}</td>
                  <td className="px-3 py-2 tabular-nums text-[var(--admin-text-muted)]">
                    {r.newsletterCampaignCount}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={`${tenantPublicOrigin(r.domain)}/admin`}
                      className="font-semibold text-[var(--admin-accent)] hover:underline"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loadError && (
            <p className="p-6 text-center text-sm text-[var(--admin-text-muted)] m-0">No tenants yet.</p>
          )}
        </div>

        <p className="mt-6 text-sm text-[var(--admin-text-muted)] m-0">
          Per-site charts and detailed analytics are on each site’s{" "}
          <strong className="font-medium text-[var(--admin-text)]">Analytics</strong> page after you select that site
          in the Site dropdown.
        </p>
      </AdminPageLayout>
    </>
  );
}
