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

/** Derive domain like pottstown.press from "Pottstown Press" — words joined with dots + .press */
export function deriveDomainFromSiteName(name: string): string {
  const parts = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  return `${parts.join(".")}.press`;
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
  { label: "Business", slug: "business" },
  { label: "Events", slug: "events" },
  { label: "Hero", slug: "hero" },
  { label: "Opinion", slug: "opinion" },
  { label: "Politics", slug: "politics" },
] as const;
