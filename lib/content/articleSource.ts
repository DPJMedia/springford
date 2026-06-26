/**
 * Single source of truth for PUBLISHED article data exposed to machine-facing
 * surfaces: the read-only MCP server (app/api/[transport]/route.ts), llms.txt
 * (app/llms.txt/route.ts), and the article JSON-LD. Keeping the query logic here
 * means what AI agents are told can never drift from what the public site shows.
 *
 * Fully TENANT-AGNOSTIC: coverage areas / sections come from each tenant's own
 * section_config, so a brand-new tenant automatically gets a correct MCP server
 * (its own domain, its own sections, its own articles) with zero code changes.
 *
 * Rules enforced everywhere in this module:
 *  - tenant-scoped (every query filters tenant_id)
 *  - status = 'published' AND published_at <= now() (no drafts / scheduled / future)
 *  - visibility = 'public' only (never expose newsletter-gated or admin-only stories)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/seo/site";
import { ARTICLE_LIST_COLUMNS } from "@/lib/supabase/articleQueries";
import { parseTenantSectionConfig } from "@/lib/tenant/sectionConfigStorage";
import type { TenantRow, ContentBlock } from "@/lib/types/database";

/** Internal section slugs that aren't real coverage areas. */
const NON_AREA_SLUGS = new Set(["hero", "latest"]);

export type Section = { slug: string; label: string };

/** The tenant's public coverage areas / sections (from section_config). */
export function getTenantSections(tenant: TenantRow): Section[] {
  return parseTenantSectionConfig(tenant).filter((s) => !NON_AREA_SLUGS.has(s.slug));
}

export interface ArticleSummary {
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  url: string;
  imageUrl: string | null;
  sections: string[];
  category: string | null;
  tags: string[];
  author: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface ArticleFull extends ArticleSummary {
  /** Plain-markdown body, flattened from content_blocks (or legacy content). */
  body: string;
}

type ListOptions = {
  section?: string;
  query?: string;
  from?: string;
  to?: string;
  since?: string;
  limit?: number;
};

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function clampLimit(n: number | undefined): number {
  if (!n || !Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

function cleanSections(sections: string[] | null | undefined): string[] {
  return (sections ?? []).filter((s) => !NON_AREA_SLUGS.has(s));
}

/** Resolve a section argument (slug OR human label) against THIS tenant's sections. */
export function resolveSectionSlug(tenant: TenantRow, input: string | undefined): string | null {
  if (!input) return null;
  const norm = input.trim().toLowerCase();
  const collapsed = norm.replace(/\s+/g, "-");
  const sections = getTenantSections(tenant);
  const hit =
    sections.find((s) => s.slug === norm) ||
    sections.find((s) => s.label.toLowerCase() === norm) ||
    sections.find((s) => s.slug === collapsed);
  return hit ? hit.slug : null;
}

function toSummary(row: Record<string, unknown>, siteUrl: string): ArticleSummary {
  return {
    slug: row.slug as string,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? null,
    excerpt: (row.excerpt as string | null) ?? null,
    url: `${siteUrl}/article/${row.slug as string}`,
    imageUrl: (row.image_url as string | null) ?? null,
    sections: cleanSections(row.sections as string[] | null),
    category: (row.category as string | null) ?? null,
    tags: (row.tags as string[] | null) ?? [],
    author: (row.author_name as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

/** Flatten content_blocks (or legacy content) into plain markdown for agents. */
export function flattenArticleBody(
  contentBlocks: ContentBlock[] | null | undefined,
  legacyContent: string | null | undefined,
): string {
  if (Array.isArray(contentBlocks) && contentBlocks.length > 0) {
    const parts = [...contentBlocks]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((b) => {
        if (b.type === "text") return (b.content ?? "").trim();
        if (b.type === "image") return b.caption ? `![${b.caption}](${b.url ?? ""})` : "";
        if (b.type === "video") return b.caption ? `[Video: ${b.caption}](${b.url ?? ""})` : `[Video](${b.url ?? ""})`;
        return "";
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n\n");
  }
  return (legacyContent ?? "").trim();
}

function basePublishedQuery(tenant: TenantRow, columns: string) {
  const supabase = createAdminClient();
  return supabase
    .from("articles")
    .select(columns)
    .eq("tenant_id", tenant.id)
    .eq("status", "published")
    .eq("visibility", "public")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString());
}

/** Latest published articles, optionally filtered by section and/or since-date. */
export async function getLatestArticles(
  tenant: TenantRow,
  opts: ListOptions = {},
): Promise<ArticleSummary[]> {
  const { siteUrl } = getSiteConfig(tenant);
  let q = basePublishedQuery(tenant, ARTICLE_LIST_COLUMNS).order("published_at", {
    ascending: false,
  });

  const section = resolveSectionSlug(tenant, opts.section);
  if (section) q = q.contains("sections", [section]);
  if (opts.since) q = q.gte("published_at", opts.since);
  if (opts.from) q = q.gte("published_at", opts.from);
  if (opts.to) q = q.lte("published_at", opts.to);

  const { data, error } = await q.limit(clampLimit(opts.limit));
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toSummary(r as unknown as Record<string, unknown>, siteUrl));
}

/** Keyword search over title / subtitle / excerpt / category (+ a tags pass). */
export async function searchArticles(
  tenant: TenantRow,
  opts: ListOptions = {},
): Promise<ArticleSummary[]> {
  const { siteUrl } = getSiteConfig(tenant);
  let q = basePublishedQuery(tenant, ARTICLE_LIST_COLUMNS).order("published_at", {
    ascending: false,
  });

  const term = opts.query?.trim();
  if (term) {
    // Escape PostgREST reserved chars in the ilike pattern.
    const safe = term.replace(/[,()*%]/g, " ").trim();
    if (safe) {
      const pattern = `%${safe}%`;
      q = q.or(
        [
          `title.ilike.${pattern}`,
          `subtitle.ilike.${pattern}`,
          `excerpt.ilike.${pattern}`,
          `category.ilike.${pattern}`,
        ].join(","),
      );
    }
  }

  const section = resolveSectionSlug(tenant, opts.section);
  if (section) q = q.contains("sections", [section]);
  if (opts.from) q = q.gte("published_at", opts.from);
  if (opts.to) q = q.lte("published_at", opts.to);

  const { data, error } = await q.limit(clampLimit(opts.limit));
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map((r) => toSummary(r as unknown as Record<string, unknown>, siteUrl));

  // Tag matches aren't expressible in the same .or() chain (array column), so
  // fold them in with a second pass when a term is present and results are thin.
  if (term && rows.length < clampLimit(opts.limit)) {
    const { data: tagData } = await basePublishedQuery(tenant, ARTICLE_LIST_COLUMNS)
      .contains("tags", [term.toLowerCase()])
      .order("published_at", { ascending: false })
      .limit(clampLimit(opts.limit));
    const seen = new Set(rows.map((r) => r.slug));
    for (const r of (tagData ?? []).map((x) => toSummary(x as unknown as Record<string, unknown>, siteUrl))) {
      if (!seen.has(r.slug)) rows.push(r);
    }
    rows = rows.slice(0, clampLimit(opts.limit));
  }

  return rows;
}

/** A single published article by slug, including its body text. */
export async function getArticleBySlug(
  tenant: TenantRow,
  slug: string,
): Promise<ArticleFull | null> {
  const { siteUrl } = getSiteConfig(tenant);
  const { data, error } = await basePublishedQuery(
    tenant,
    `${ARTICLE_LIST_COLUMNS}, content, content_blocks`,
  )
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  return {
    ...toSummary(row, siteUrl),
    body: flattenArticleBody(
      row.content_blocks as ContentBlock[] | null,
      row.content as string | null,
    ),
  };
}

export interface SectionCoverage {
  slug: string;
  label: string;
  articleCount: number;
  latest: ArticleSummary[];
}

/** Coverage summary per section (count + a few latest headlines each). */
export async function listCoverageBySection(
  tenant: TenantRow,
  latestPer = 3,
): Promise<SectionCoverage[]> {
  const out: SectionCoverage[] = [];
  for (const s of getTenantSections(tenant)) {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "published")
      .eq("visibility", "public")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .contains("sections", [s.slug]);

    const latest = await getLatestArticles(tenant, { section: s.slug, limit: latestPer });

    out.push({ slug: s.slug, label: s.label, articleCount: count ?? 0, latest });
  }
  // Most-covered first; drop empty sections so the overview stays useful.
  return out.filter((c) => c.articleCount > 0).sort((a, b) => b.articleCount - a.articleCount);
}
