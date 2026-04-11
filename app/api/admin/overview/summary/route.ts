import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/api/requireSuperAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data: tenants, error: tErr } = await admin
    .from("tenants")
    .select("id, name, slug, domain, is_active")
    .order("name", { ascending: true });

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const rows: TenantOverviewRow[] = await Promise.all(
    (tenants ?? []).map(async (t) => {
      const [
        { count: articleCount },
        { count: publishedArticleCount },
        { count: pageViewCount },
        { count: adCount },
        { count: newsletterCampaignCount },
      ] = await Promise.all([
        admin.from("articles").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
        admin
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", t.id)
          .eq("status", "published"),
        admin.from("page_views").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
        admin.from("ads").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
        admin
          .from("newsletter_campaigns")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", t.id),
      ]);

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        domain: t.domain,
        is_active: t.is_active,
        articleCount: articleCount ?? 0,
        publishedArticleCount: publishedArticleCount ?? 0,
        pageViewCount: pageViewCount ?? 0,
        adCount: adCount ?? 0,
        newsletterCampaignCount: newsletterCampaignCount ?? 0,
      };
    }),
  );

  const totals = rows.reduce(
    (acc, r) => ({
      articleCount: acc.articleCount + r.articleCount,
      publishedArticleCount: acc.publishedArticleCount + r.publishedArticleCount,
      pageViewCount: acc.pageViewCount + r.pageViewCount,
      adCount: acc.adCount + r.adCount,
      newsletterCampaignCount: acc.newsletterCampaignCount + r.newsletterCampaignCount,
    }),
    {
      articleCount: 0,
      publishedArticleCount: 0,
      pageViewCount: 0,
      adCount: 0,
      newsletterCampaignCount: 0,
    },
  );

  return NextResponse.json({ tenants: rows, totals });
}
