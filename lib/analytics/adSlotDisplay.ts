import { getAdSlotLabel } from "@/lib/advertising/adSlots";

/**
 * Inventory order for analytics tables: mobile placements first (homepage, then article),
 * then desktop (homepage, then article). Unknown slots sort last.
 */
export const AD_SLOT_TABLE_ORDER: string[] = [
  // Mobile — homepage
  "homepage-banner-top-mobile",
  "homepage-mobile-above-most-read",
  "homepage-mobile-above-editors-picks",
  "homepage-mobile-between-editors-picks-footer",
  // Mobile — article
  "article-mobile-inline",
  "article-mobile-end",
  "article-mobile-below-tags",
  // Desktop — homepage
  "homepage-banner-top",
  "homepage-sidebar-top",
  "homepage-sidebar-middle",
  "homepage-sidebar-bottom",
  "homepage-content-top",
  "homepage-content-middle-1",
  "homepage-content-middle-2",
  "homepage-banner-bottom",
  // Desktop — article
  "article-sidebar-top",
  "article-sidebar-bottom",
  "article-inline-1",
  "article-inline-2",
];

/** Human-readable slot label (Device + Home|Article + index). */
export function formatAdSlotDisplayName(slot: string): string {
  return getAdSlotLabel(slot);
}

export function compareAdSlotsForTable(a: string, b: string): number {
  const ia = AD_SLOT_TABLE_ORDER.indexOf(a);
  const ib = AD_SLOT_TABLE_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
