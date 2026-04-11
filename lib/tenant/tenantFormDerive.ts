/** Derive URL slug from site name: lowercase, hyphens, alnum only. */
export function deriveSlugFromSiteName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Derive apex domain from site name: lowercase, spaces → periods (same “shape” as the name).
 * Single-word names get `.press` as the TLD (e.g. "Pottstown" → "pottstown.press").
 * Multi-word names join with dots (e.g. "Pottstown Press" → "pottstown.press").
 */
export function deriveDomainFromSiteName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s.]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  if (!cleaned) return "";
  const segments = cleaned.split(".").filter(Boolean);
  if (segments.length === 1) {
    return `${segments[0]}.press`;
  }
  return cleaned;
}

export function deriveSectionSlugFromLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const DEFAULT_TENANT_SECTIONS = [
  { label: "Hero", slug: "hero" },
  { label: "Business", slug: "business" },
  { label: "Events", slug: "events" },
  { label: "Opinion", slug: "opinion" },
  { label: "Politics", slug: "politics" },
] as const;
