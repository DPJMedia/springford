import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/seo/site";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";

const MAX_ARTICLES = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenantRow = await getTenantById(tenantId);
  if (!tenantRow) {
    throw new Error(`Tenant not found for sitemap: ${tenantId}`);
  }
  const { siteUrl: base, sectionSlugs } = getSiteConfig(tenantRow);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/subscribe`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/advertise`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...sectionSlugs.map((slug) => ({
      url: `${base}/section/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
  ];

  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("slug, updated_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(MAX_ARTICLES);

  const articleEntries: MetadataRoute.Sitemap = (articles || []).map((a) => ({
    url: `${base}/article/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...articleEntries];
}
