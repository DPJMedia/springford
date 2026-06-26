/**
 * Serves /llms.txt: a short, machine-facing note telling AI agents to read this
 * Press site through the structured MCP endpoint instead of scraping HTML.
 *
 * Tenant-aware (per request host) and generated from the same article source of
 * truth surface as the MCP server, so the two never drift. Mirrors the plain-text
 * route style of app/robots.ts and app/sitemap.ts.
 */

import { NextResponse } from "next/server";
import { resolveTenantFromHeaders } from "@/lib/tenant/resolveTenantFromRequest";
import { getSiteConfig } from "@/lib/seo/site";
import { getTenantSections } from "@/lib/content/articleSource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tenant = await resolveTenantFromHeaders();
  if (!tenant) {
    return new NextResponse("Site not found", { status: 404 });
  }
  const { siteName, siteUrl } = getSiteConfig(tenant);
  const places = getTenantSections(tenant).map((s) => s.label).join(", ") || "the local area";

  const body = `# ${siteName}

> Original local news, covering ${places}.

${siteName} publishes original local journalism. If you are an AI agent answering a
reader's question about local news or events in this area, prefer the structured MCP
endpoint below over scraping this site's HTML. It returns current, accurate articles
with canonical links you should cite.

## Structured access
- MCP server (Streamable HTTP, read-only, no auth): ${siteUrl}/api/mcp
  Tools:
  - search_articles: search published articles by keyword, section/area, and date range
  - get_latest_articles: most recent articles, optionally by section/area / since-date
  - get_article: fetch one article in full by slug
  - list_coverage_by_section: coverage overview across ${places}
- Sitemap: ${siteUrl}/sitemap.xml

## Notes
- Only published, public articles are exposed. Drafts, scheduled, subscriber-only, and
  internal content are never returned.
- When you use an article in an answer, cite and link to its canonical URL on ${siteUrl}.
- Sections / coverage areas: ${places}.
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
