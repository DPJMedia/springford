/**
 * Read-only MCP server for the Press network (Spring-Ford Press and any sibling
 * tenant). Exposes PUBLISHED local-news articles, queried live from Supabase, so
 * an AI assistant answering "what's happening in Limerick?" can find, read, and
 * cite our current reporting instead of scraping HTML.
 *
 * Streamable HTTP, read-only, no auth, stateless. Tenant is resolved per request
 * from the host (the same multi-tenant resolution the rest of the site uses), so
 * the same code serves every Press site on its own domain.
 *
 * Endpoint (basePath '/api' + the [transport] segment): https://<site>/api/mcp
 *
 * All article data comes from lib/content/articleSource.ts — the single source of
 * truth shared with llms.txt and the on-page JSON-LD.
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { resolveTenantFromHeaders } from "@/lib/tenant/resolveTenantFromRequest";
import { getSiteConfig } from "@/lib/seo/site";
import type { TenantRow } from "@/lib/types/database";
import {
  searchArticles,
  getLatestArticles,
  getArticleBySlug,
  listCoverageByMunicipality,
  MUNICIPALITIES,
  type ArticleSummary,
} from "@/lib/content/articleSource";

export const runtime = "nodejs";
export const maxDuration = 60;

function formatSummary(a: ArticleSummary): string {
  const date = a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 10) : "undated";
  const places = a.municipalities.length ? ` [${a.municipalities.join(", ")}]` : "";
  const summary = a.excerpt || a.subtitle || "";
  return `- ${a.title}${places} (${date})\n  ${summary}\n  Read: ${a.url}`;
}

const MUNI_HINT = `One of: ${MUNICIPALITIES.map((m) => `"${m.slug}" (${m.label})`).join(", ")}.`;

function buildHandler(tenant: TenantRow) {
  const { siteName, siteUrl } = getSiteConfig(tenant);

  return createMcpHandler(
    (server) => {
      server.registerTool(
        "search_articles",
        {
          title: `Search ${siteName} articles`,
          description:
            `Search published ${siteName} local-news articles by keyword, optionally ` +
            `filtered by municipality and/or date range. Returns headline, summary, ` +
            `municipalities, publish date, and a canonical link to read the full story.`,
          inputSchema: {
            query: z.string().optional().describe("Keywords to match against title, subtitle, excerpt, category, and tags."),
            municipality: z.string().optional().describe(`Filter to one municipality. ${MUNI_HINT}`),
            from: z.string().optional().describe("ISO date/datetime lower bound on publish date (inclusive)."),
            to: z.string().optional().describe("ISO date/datetime upper bound on publish date (inclusive)."),
            limit: z.number().int().optional().describe("Max results, 1-50 (default 10)."),
          },
        },
        async ({ query, municipality, from, to, limit }) => {
          const rows = await searchArticles(tenant, { query, municipality, from, to, limit });
          if (rows.length === 0) {
            return { content: [{ type: "text", text: `No published articles matched that search on ${siteName}.` }] };
          }
          return { content: [{ type: "text", text: rows.map(formatSummary).join("\n\n") }] };
        },
      );

      server.registerTool(
        "get_latest_articles",
        {
          title: `Get latest ${siteName} articles`,
          description:
            `The most recently published ${siteName} articles, optionally filtered by ` +
            `municipality and/or a since-date. Returns headline, summary, and canonical link.`,
          inputSchema: {
            municipality: z.string().optional().describe(`Filter to one municipality. ${MUNI_HINT}`),
            since: z.string().optional().describe("ISO date/datetime lower bound on publish date (inclusive)."),
            limit: z.number().int().optional().describe("Max results, 1-50 (default 10)."),
          },
        },
        async ({ municipality, since, limit }) => {
          const rows = await getLatestArticles(tenant, { municipality, since, limit });
          if (rows.length === 0) {
            return { content: [{ type: "text", text: `No published articles found on ${siteName}.` }] };
          }
          return { content: [{ type: "text", text: rows.map(formatSummary).join("\n\n") }] };
        },
      );

      server.registerTool(
        "get_article",
        {
          title: `Get a ${siteName} article by slug`,
          description:
            `Fetch one published ${siteName} article in full (headline, byline, publish ` +
            `date, municipalities, and the full body text) by its slug. The slug is the ` +
            `last path segment of the article URL.`,
          inputSchema: {
            slug: z.string().describe("Article slug, e.g. the last path segment of /article/<slug>."),
          },
        },
        async ({ slug }) => {
          const a = await getArticleBySlug(tenant, slug);
          if (!a) {
            return {
              content: [{ type: "text", text: `No published article found with slug "${slug}" on ${siteName}.` }],
              isError: true,
            };
          }
          const header = [
            `# ${a.title}`,
            a.subtitle ? `## ${a.subtitle}` : "",
            a.author ? `By ${a.author}` : "",
            a.publishedAt ? `Published ${new Date(a.publishedAt).toISOString().slice(0, 10)}` : "",
            a.municipalities.length ? `Municipalities: ${a.municipalities.join(", ")}` : "",
            `Canonical URL: ${a.url}`,
          ]
            .filter(Boolean)
            .join("\n");
          return { content: [{ type: "text", text: `${header}\n\n${a.body}` }] };
        },
      );

      server.registerTool(
        "list_coverage_by_municipality",
        {
          title: `List ${siteName} coverage by municipality`,
          description:
            `Overview of how much ${siteName} covers each municipality it serves ` +
            `(${MUNICIPALITIES.map((m) => m.label).join(", ")}): article counts plus a few ` +
            `recent headlines per place. Use it to see where to dig in, then call ` +
            `get_latest_articles or search_articles for that municipality.`,
        },
        async () => {
          const coverage = await listCoverageByMunicipality(tenant);
          const text = coverage
            .map((c) => {
              const heads = c.latest.length
                ? c.latest.map((a) => `    - ${a.title} (${a.url})`).join("\n")
                : "    (no published articles yet)";
              return `${c.label} — ${c.articleCount} published article(s):\n${heads}`;
            })
            .join("\n\n");
          return { content: [{ type: "text", text: `${siteName} coverage by municipality:\n\n${text}` }] };
        },
      );
    },
    {
      serverInfo: { name: `press-${tenant.slug}`, version: "1.0.0" },
      instructions:
        `${siteName} read-only article server. Use it to find and cite current local-news ` +
        `coverage for ${siteUrl}. Prefer search_articles / get_latest_articles to discover ` +
        `stories, then get_article for full text. Always link readers to the canonical URL.`,
    },
    {
      basePath: "/api",
      maxDuration: 60,
      verboseLogs: process.env.NODE_ENV !== "production",
    },
  );
}

async function handle(req: NextRequest) {
  const tenant = await resolveTenantFromHeaders();
  if (!tenant) {
    return new Response(JSON.stringify({ error: "Site not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  const handler = buildHandler(tenant);
  return handler(req);
}

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  // A human opening this URL in a browser does a plain GET with Accept: text/html.
  // Real MCP clients use POST (or an SSE stream with Accept: text/event-stream).
  // For the browser case, show a friendly explainer instead of a raw JSON-RPC error.
  if (accept.includes("text/html") && !accept.includes("text/event-stream")) {
    const tenant = await resolveTenantFromHeaders();
    const siteName = tenant ? getSiteConfig(tenant).siteName : "This site";
    const siteUrl = tenant ? getSiteConfig(tenant).siteUrl : "";
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${siteName} — MCP endpoint</title></head><body style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;line-height:1.55;color:#1a1a1a"><h1 style="font-size:22px">${siteName} — AI (MCP) endpoint</h1><p>This is a machine endpoint for AI assistants (Model Context Protocol), <strong>not a web page</strong>. It speaks JSON-RPC over HTTP POST, so opening it in a browser won't show anything useful — that's expected.</p><p>Looking for something? Try:</p><ul><li><a href="${siteUrl}/llms.txt">/llms.txt</a> — what this endpoint offers</li><li><a href="${siteUrl}">${siteUrl}</a> — the website</li></ul><p style="color:#555;font-size:14px">For AI tools: connect to <code>${siteUrl}/api/mcp</code> (Streamable HTTP, read-only, no auth). Tools: search_articles, get_latest_articles, get_article, list_coverage_by_municipality.</p></body></html>`;
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }
  return handle(req);
}

export const POST = handle;
