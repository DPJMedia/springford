/**
 * Mirrors `app/admin/ads/page.tsx` — site ad inventory for the quoter UI.
 * Grouped for clarity (desktop vs mobile, homepage vs article).
 */

export const AD_SLOTS = [
  { value: "homepage-banner-top", label: "Homepage — banner below hero (desktop)" },
  { value: "homepage-banner-top-mobile", label: "Homepage — below hero (mobile)" },
  { value: "homepage-mobile-above-most-read", label: "Homepage mobile — above Trending" },
  { value: "homepage-mobile-above-editors-picks", label: "Homepage mobile — above Editor’s Picks" },
  { value: "homepage-mobile-between-editors-picks-footer", label: "Homepage mobile — picks & footer" },
  { value: "homepage-sidebar-top", label: "Homepage — sidebar top" },
  { value: "homepage-sidebar-middle", label: "Homepage — sidebar middle" },
  { value: "homepage-sidebar-bottom", label: "Homepage — sidebar bottom" },
  { value: "homepage-content-top", label: "Homepage — main content top" },
  { value: "homepage-content-middle-1", label: "Homepage — main content middle 1" },
  { value: "homepage-content-middle-2", label: "Homepage — main content middle 2" },
  { value: "homepage-banner-bottom", label: "Homepage — bottom banner" },
  { value: "article-sidebar-top", label: "Article — sidebar top" },
  { value: "article-sidebar-bottom", label: "Article — sidebar bottom (sticky)" },
  { value: "article-inline-1", label: "Article — inline ad 1" },
  { value: "article-inline-2", label: "Article — inline ad 2" },
  { value: "article-mobile-inline", label: "Article mobile — between blocks" },
  { value: "article-mobile-end", label: "Article mobile — end of article" },
  { value: "article-mobile-below-tags", label: "Article mobile — below tags" },
] as const;
