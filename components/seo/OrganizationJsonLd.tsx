import { SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const LOGO_URL = `${SITE_URL}/springford-press-logo.svg`;

/**
 * Organization + WebSite (SearchAction) for brand context and discoverability.
 * Sitelinks in Google are automated; this helps Google understand site structure.
 */
export function OrganizationJsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      "Local news for Spring-Ford, Limerick, Royersford, Spring City, Upper Providence, and Montgomery & Chester County, Pennsylvania.",
    knowsAbout: SITE_KEYWORDS,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
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
