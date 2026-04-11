import type { TenantRow } from "@/lib/types/database";

export function parseTenantSectionConfig(
  tenant: TenantRow
): Array<{ slug: string; label: string }> {
  const raw = tenant.section_config;
  if (!Array.isArray(raw)) return [];
  const out: Array<{ slug: string; label: string }> = [];
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
