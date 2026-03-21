import type { Article } from "@/lib/types/database";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

const LOGO_URL = `${SITE_URL}/springford-press-logo.svg`;

type Props = {
  article: Article;
};

/**
 * NewsArticle + BreadcrumbList JSON-LD for Google rich results and News eligibility signals.
 */
function absoluteImageUrl(url: string | null): string {
  if (!url) return LOGO_URL;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

export function ArticleJsonLd({ article }: Props) {
  const pageUrl = `${SITE_URL}/article/${article.slug}`;
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
      name: article.author_name || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
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
        item: SITE_URL,
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
