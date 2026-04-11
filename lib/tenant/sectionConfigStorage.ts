import type { TenantRow } from "@/lib/types/database";

export type SectionEntry = { slug: string; label: string };

/** Optional Facebook URL stored alongside sections in tenants.section_config JSON (no DDL). */
export type ParsedSectionConfig = {
  sections: SectionEntry[];
  facebook_url: string | null;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSectionsArray(raw: unknown[]): SectionEntry[] {
  const out: SectionEntry[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "slug" in item &&
      "label" in item &&
      typeof (item as { slug: unknown }).slug === "string" &&
      typeof (item as { label: unknown }).label === "string"
    ) {
      out.push({
        slug: (item as { slug: string }).slug,
        label: (item as { label: string }).label,
      });
    }
  }
  return out;
}

/** Read sections + optional facebook URL from DB jsonb (array legacy or { sections, facebook_url }). */
export function parseStoredSectionConfig(raw: unknown): ParsedSectionConfig {
  if (Array.isArray(raw)) {
    return { sections: normalizeSectionsArray(raw), facebook_url: null };
  }
  if (raw && typeof raw === "object" && raw !== null && "sections" in raw) {
    const o = raw as Record<string, unknown>;
    const sec = o.sections;
    const sections = Array.isArray(sec) ? normalizeSectionsArray(sec) : [];
    const fb = o.facebook_url;
    const facebook_url =
      typeof fb === "string" && fb.trim() ? fb.trim() : null;
    return { sections, facebook_url };
  }
  return { sections: [], facebook_url: null };
}

/** Persist to jsonb: array-only when no facebook URL (legacy-compatible); object when facebook set. */
export function serializeSectionConfigForDb(
  sections: SectionEntry[],
  facebookUrl: string | null | undefined,
): unknown {
  const fb = typeof facebookUrl === "string" ? facebookUrl.trim() : "";
  if (!fb) {
    return sections;
  }
  return { sections, facebook_url: fb };
}

/** Validate sections for admin API (POST/PATCH). */
export function validateSectionsForApi(
  raw: unknown,
): SectionEntry[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const out: SectionEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const slug = String((row as Record<string, unknown>).slug ?? "").trim();
    const label = String((row as Record<string, unknown>).label ?? "").trim();
    if (!slug || !label || !SLUG_RE.test(slug)) return null;
    out.push({ slug, label });
  }
  return out;
}

export function parseTenantSectionConfig(tenant: TenantRow): SectionEntry[] {
  return parseStoredSectionConfig(tenant.section_config).sections;
}

export function parseTenantFacebookUrl(tenant: TenantRow): string | null {
  return parseStoredSectionConfig(tenant.section_config).facebook_url;
}
