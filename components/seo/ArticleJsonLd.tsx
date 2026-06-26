import type { Article, TenantRow } from "@/lib/types/database";
import { getSiteConfig } from "@/lib/seo/site";
import { getOptimizedOgImageUrl } from "@/lib/seo/ogImage";

type Props = {
  article: Article;
  tenant: TenantRow;
};

/**
 * NewsArticle + BreadcrumbList JSON-LD for Google rich results and News eligibility signals.
 * Server-rendered JSON-LD for SEO.
 */
export function ArticleJsonLd({ article, tenant }: Props) {
  const { siteUrl, siteName } = getSiteConfig(tenant);
  const logoUrl = `${siteUrl}/springford-press-logo.svg`;

  function absoluteImageUrl(url: string | null): string {
    if (!url) return logoUrl;
    let absolute: string;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      absolute = url;
    } else if (url.startsWith("/")) {
      absolute = `${siteUrl}${url}`;
    } else {
      absolute = `${siteUrl}/${url}`;
    }
    // Match the optimized OG image so JSON-LD and link previews agree on a
    // single canonical, small, properly-sized variant.
    return getOptimizedOgImageUrl(absolute) ?? absolute;
  }

  const pageUrl = `${siteUrl}/article/${article.slug}`;
  // Syndicated copies declare the original as canonical so AI/search treat one origin.
  const canonicalUrl = article.canonical_url || pageUrl;
  const isoPublished = article.published_at
    ? new Date(article.published_at).toISOString()
    : undefined;
  const isoModified = article.updated_at
    ? new Date(article.updated_at).toISOString()
    : isoPublished;

  const newsArticle = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description:
      (article.meta_description || article.excerpt || article.title).slice(0, 500) || undefined,
    image: [absoluteImageUrl(article.image_url)],
    datePublished: isoPublished,
    dateModified: isoModified,
    author: {
      "@type": "Person",
      name: article.author_name || siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    isAccessibleForFree: true,
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: article.title,
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
