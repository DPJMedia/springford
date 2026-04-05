/**
 * Site ad inventory. `value` is the stable DB/API key; `label` is shown in admin,
 * previews, analytics, and the ad quoter.
 *
 * Labels: `{Device} {Home|Article} {n}` — n is top-to-bottom order on that surface;
 * main-column placements are numbered before sidebar placements on home/article.
 */

/** Stored on `ads.ad_slot` when the creative has no slot assignments yet (draft / inventory). */
export const UNASSIGNED_AD_SLOT = "unassigned";

export const AD_SLOT_LABELS: Record<string, string> = {
  // Desktop — Home (main column first, then sidebars, then bottom full-width)
  "homepage-banner-top": "Desktop Home 1",
  "homepage-content-top": "Desktop Home 2",
  "homepage-content-middle-1": "Desktop Home 3",
  "homepage-content-middle-2": "Desktop Home 4",
  "homepage-sidebar-top": "Desktop Home 5",
  "homepage-sidebar-middle": "Desktop Home 6",
  "homepage-sidebar-bottom": "Desktop Home 7",
  "homepage-banner-bottom": "Desktop Home 8",
  // Mobile — Home (top to bottom)
  "homepage-banner-top-mobile": "Mobile Home 1",
  "homepage-mobile-above-most-read": "Mobile Home 2",
  "homepage-mobile-above-editors-picks": "Mobile Home 3",
  "homepage-mobile-between-editors-picks-footer": "Mobile Home 4",
  // Desktop — Article (inline in body, then sidebar)
  "article-inline-1": "Desktop Article 1",
  "article-inline-2": "Desktop Article 2",
  "article-sidebar-top": "Desktop Article 3",
  "article-sidebar-bottom": "Desktop Article 4",
  // Mobile — Article
  "article-mobile-inline": "Mobile Article 1",
  "article-mobile-end": "Mobile Article 2",
  "article-mobile-below-tags": "Mobile Article 3",
};

/** Order used in admin dropdowns and slot pickers (grouped by surface). */
export const AD_SLOT_IDS_IN_ORDER: string[] = [
  "homepage-banner-top",
  "homepage-banner-top-mobile",
  "homepage-mobile-above-most-read",
  "homepage-mobile-above-editors-picks",
  "homepage-mobile-between-editors-picks-footer",
  "homepage-content-top",
  "homepage-content-middle-1",
  "homepage-content-middle-2",
  "homepage-sidebar-top",
  "homepage-sidebar-middle",
  "homepage-sidebar-bottom",
  "homepage-banner-bottom",
  "article-inline-1",
  "article-inline-2",
  "article-sidebar-top",
  "article-sidebar-bottom",
  "article-mobile-inline",
  "article-mobile-end",
  "article-mobile-below-tags",
];

export function getAdSlotLabel(slotId: string): string {
  return AD_SLOT_LABELS[slotId] ?? slotId;
}

/**
 * Ad manager table: comma-separated slot list. Uses Tier wording plus Mobile/Desktop
 * (unlike `AD_SLOT_LABELS`, which uses Home/Article numbering without "Tier").
 */
export const AD_SLOT_TABLE_LABELS: Record<string, string> = {
  [UNASSIGNED_AD_SLOT]: "Unassigned",
  "homepage-banner-top": "Desktop Home Tier 1",
  "homepage-content-top": "Desktop Home Tier 2",
  "homepage-content-middle-1": "Desktop Home Tier 3",
  "homepage-content-middle-2": "Desktop Home Tier 4",
  "homepage-sidebar-top": "Desktop Home Tier 5",
  "homepage-sidebar-middle": "Desktop Home Tier 6",
  "homepage-sidebar-bottom": "Desktop Home Tier 7",
  "homepage-banner-bottom": "Desktop Home Tier 8",
  "homepage-banner-top-mobile": "Mobile Home Tier 1",
  "homepage-mobile-above-most-read": "Mobile Home Tier 2",
  "homepage-mobile-above-editors-picks": "Mobile Home Tier 3",
  "homepage-mobile-between-editors-picks-footer": "Mobile Home Tier 4",
  "article-inline-1": "Desktop Article Tier 1",
  "article-inline-2": "Desktop Article Tier 2",
  "article-sidebar-top": "Desktop Article Tier 3",
  "article-sidebar-bottom": "Desktop Article Tier 4",
  "article-mobile-inline": "Mobile Article Tier 1",
  "article-mobile-end": "Mobile Article Tier 2",
  "article-mobile-below-tags": "Mobile Article Tier 3",
};

export function getAdSlotTableLabel(slotId: string): string {
  return AD_SLOT_TABLE_LABELS[slotId] ?? getAdSlotLabel(slotId);
}

export function sortAdSlotIdsByInventoryOrder(ids: string[]): string[] {
  const idx = new Map(AD_SLOT_IDS_IN_ORDER.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => (idx.get(a) ?? 999) - (idx.get(b) ?? 999));
}

export const AD_SLOTS = AD_SLOT_IDS_IN_ORDER.map((value) => ({
  value,
  label: getAdSlotLabel(value),
}));
