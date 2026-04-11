import type { TenantRow } from "@/lib/types/database";

/** Canonical site URL — must match production (Vercel redirects apex → www). */
export const SITE_URL = "https://www.springford.press";

export const SITE_NAME = "Spring-Ford Press";

/** Public section slugs for sitemap (match SECTION_TITLES in app/section/[section]/page.tsx) */
export const PUBLIC_SECTION_SLUGS = [
  "latest",
  "spring-city",
  "royersford",
  "limerick",
  "upper-providence",
  "school-district",
  "politics",
  "business",
  "events",
  "opinion",
  "town-council",
  "sports-entertainment",
  "technology",
] as const;

/** Core keywords for root metadata (local + brand) */
export const SITE_KEYWORDS = [
  "Spring-Ford",
  "Spring-Ford Press",
  "Limerick PA",
  "Royersford",
  "Spring City",
  "Upper Providence",
  "Montgomery County news",
  "Chester County news",
  "Pennsylvania local news",
];

/** Phase 3: replace static SITE_URL / SITE_NAME / PUBLIC_SECTION_SLUGS with this per tenant. */
export function getSiteConfig(tenant: TenantRow): {
  siteUrl: string;
  siteName: string;
  sectionSlugs: string[];
} {
  const domain = tenant.domain.trim().toLowerCase();
  const siteUrl = `https://www.${domain}`;
  const siteName = tenant.name;
  const raw = tenant.section_config;
  const sectionSlugs: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (
        item &&
        typeof item === "object" &&
        "slug" in item &&
        typeof (item as { slug: unknown }).slug === "string"
      ) {
        sectionSlugs.push((item as { slug: string }).slug);
      }
    }
  }
  return { siteUrl, siteName, sectionSlugs };
}
