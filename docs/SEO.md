# SEO checklist (Spring-Ford Press)

Technical pieces in this repo:

- **`app/sitemap.ts`** — Lists key pages + published articles for crawlers.
- **`app/robots.ts`** — Allows indexing of public routes; points to the sitemap.
- **`components/seo/OrganizationJsonLd.tsx`** — Organization + WebSite (including site search) in the root layout.
- **`components/seo/ArticleJsonLd.tsx`** — `NewsArticle` + `BreadcrumbList` on each article page.
- **Article `generateMetadata`** — Title, description, OG/Twitter, `publishedTime` / `modifiedTime`.

## What you must do in Google tools

1. **Google Search Console**
   - Add and verify `springford.press`.
   - Submit **`https://springford.press/sitemap.xml`** (Sitemaps).
   - Use **URL Inspection** on a few article URLs and “Request indexing” if needed.
   - Check **Coverage / Pages** over the next weeks for crawl errors.

2. **Sitelinks (the “dropdown” links under your main result)**

   Google generates these automatically. You cannot turn them on in code. You *can* help by:
   - Clear site structure and internal links to important pages (sections, subscribe, contact).
   - Consistent titles in navigation.
   - Time + authority (no guaranteed timeline).

3. **Google News / Top Stories**

   - Apply in **Google News Publisher Center** with your site; follow [content policies](https://support.google.com/news/publisher-center/).
   - Approval is manual; newer sites often wait weeks or months.
   - Strong signals: original reporting, regular publishing, clear bylines, `NewsArticle` JSON-LD (already on articles), valid HTTPS, no misleading metadata.

4. **Ranking for “Spring-Ford”, “Limerick”, etc.**

   - Competition (e.g. school district `.net`) is high; **brand + locality** in titles and copy helps but is not a guarantee.
   - Build **backlinks**, local mentions, and consistent publishing.
   - Ensure each article has a good **meta title/description** and mentions relevant places naturally in the body.

## Subscriber-only articles

Paywalled content may still be indexed in limited form; Google’s handling varies. Prefer **public** visibility for pieces you most need indexed and in News.
