import { getSiteConfig, SITE_KEYWORDS } from "@/lib/seo/site";
import type { TenantRow } from "@/lib/types/database";

type Props = {
  tenant: TenantRow;
};

/**
 * Organization + WebSite (SearchAction) for brand context and discoverability.
 * Server-rendered JSON-LD for SEO.
 */
export function OrganizationJsonLd({ tenant }: Props) {
  const { siteUrl, siteName: name } = getSiteConfig(tenant);
  const logoUrl = `${siteUrl}/springford-press-logo.svg`;
  const description = `${name} — local news and community reporting.`;

  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name,
    url: siteUrl,
    logo: logoUrl,
    description,
    knowsAbout: SITE_KEYWORDS,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name,
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
