/**
 * Spring-Ford Press — fixed package + add-on quoter (v2).
 * Traffic index: reuses `viewershipMultiplier` from `quoteModel.ts` (same trailing-30d logic).
 * Package list prices are calibrated at PACKAGE_QUOTER_BASELINE_MONTHLY_VIEWS (25k).
 */

import { getAdSlotTableLabel } from "@/lib/advertising/adSlots";
import { viewershipMultiplier } from "@/lib/advertising/quoteModel";
import type { SavedAdQuote } from "@/lib/types/database";

/** List prices / CPMs in the rate card assume this trailing-30d view level. */
export const PACKAGE_QUOTER_BASELINE_MONTHLY_VIEWS = 25_000;

export const ADD_ON_PRICES_USD = {
  sponsoredArticle: 150,
  newsletterMention: 40,
  newsletterSpotlight: 95,
  facebookPost: 75,
  categoryExclusivityMonthly: 175,
} as const;

/** Max quantity per add-on line in the quoter UI (0–15). */
export const ADD_ON_MAX_QUANTITY = 15;

export type AdPackageId =
  | "article-premier"
  | "article-featured"
  | "article-standard"
  | "homepage-premier"
  | "homepage-standard"
  | "sidebar";

export interface AdPackageDefinition {
  id: AdPackageId;
  name: string;
  basePriceUsd: number;
  impressionsPerMonth: number;
  /** Reference CPM at list price (informational) */
  baseCpmUsd: number;
  slotIds: string[];
}

export const AD_PACKAGES: AdPackageDefinition[] = [
  {
    id: "article-premier",
    name: "Article Premier",
    basePriceUsd: 725,
    impressionsPerMonth: 30_354,
    baseCpmUsd: 23.88,
    slotIds: ["article-mobile-inline", "article-sidebar-top"],
  },
  {
    id: "article-featured",
    name: "Article Featured",
    basePriceUsd: 600,
    impressionsPerMonth: 22_806,
    baseCpmUsd: 26.31,
    slotIds: ["article-mobile-end", "article-sidebar-bottom"],
  },
  {
    id: "article-standard",
    name: "Article Standard",
    basePriceUsd: 550,
    impressionsPerMonth: 20_410,
    baseCpmUsd: 26.95,
    slotIds: ["article-mobile-below-tags", "article-inline-1"],
  },
  {
    id: "homepage-premier",
    name: "Homepage Premier",
    basePriceUsd: 275,
    impressionsPerMonth: 6203,
    baseCpmUsd: 44.33,
    slotIds: ["homepage-banner-top-mobile", "homepage-banner-top", "homepage-sidebar-top"],
  },
  {
    id: "homepage-standard",
    name: "Homepage Standard",
    basePriceUsd: 200,
    impressionsPerMonth: 5112,
    baseCpmUsd: 39.13,
    slotIds: ["homepage-mobile-above-most-read", "homepage-content-top", "article-inline-2"],
  },
  {
    id: "sidebar",
    name: "Sidebar",
    basePriceUsd: 150,
    impressionsPerMonth: 3442,
    baseCpmUsd: 43.58,
    slotIds: [
      "homepage-content-middle-1",
      "homepage-sidebar-middle",
      "homepage-sidebar-bottom",
      "homepage-banner-bottom",
    ],
  },
];

export function getPackageById(id: AdPackageId | string): AdPackageDefinition | undefined {
  return AD_PACKAGES.find((p) => p.id === id);
}

export interface AddOnQuantities {
  sponsoredArticles: number;
  newsletterMentions: number;
  newsletterSpotlights: number;
  facebookPosts: number;
  categoryExclusivity: boolean;
}

export function defaultAddOns(): AddOnQuantities {
  return {
    sponsoredArticles: 0,
    newsletterMentions: 0,
    newsletterSpotlights: 0,
    facebookPosts: 0,
    categoryExclusivity: false,
  };
}

/** Clamp add-on quantities to 0…ADD_ON_MAX_QUANTITY (except boolean exclusivity). */
export function clampAddOns(a: AddOnQuantities): AddOnQuantities {
  const cap = ADD_ON_MAX_QUANTITY;
  const q = (n: number) => Math.min(cap, Math.max(0, Math.floor(n)));
  return {
    sponsoredArticles: q(a.sponsoredArticles),
    newsletterMentions: q(a.newsletterMentions),
    newsletterSpotlights: q(a.newsletterSpotlights),
    facebookPosts: q(a.facebookPosts),
    categoryExclusivity: Boolean(a.categoryExclusivity),
  };
}

/**
 * Traffic-adjusted package price (add-ons excluded). Never below published list:
 * at or below the rate-card baseline (25k trailing views), returns list price.
 * Only when views are **above** baseline does the price increase (same multiplier curve).
 */
export function indexedPackagePriceUsd(
  baseListUsd: number,
  monthlySiteViews: number | null,
  trafficIndexActive: boolean,
): number {
  if (!trafficIndexActive || monthlySiteViews == null || monthlySiteViews < 1) {
    return baseListUsd;
  }
  if (monthlySiteViews <= PACKAGE_QUOTER_BASELINE_MONTHLY_VIEWS) {
    return baseListUsd;
  }
  const m = viewershipMultiplier(monthlySiteViews);
  const m0 = viewershipMultiplier(PACKAGE_QUOTER_BASELINE_MONTHLY_VIEWS);
  if (m0 <= 0) return baseListUsd;
  return Math.round(baseListUsd * (m / m0));
}

export function addOnMonthlyTotalUsd(a: AddOnQuantities): number {
  const c = clampAddOns(a);
  let t = 0;
  t += c.sponsoredArticles * ADD_ON_PRICES_USD.sponsoredArticle;
  t += c.newsletterMentions * ADD_ON_PRICES_USD.newsletterMention;
  t += c.newsletterSpotlights * ADD_ON_PRICES_USD.newsletterSpotlight;
  t += c.facebookPosts * ADD_ON_PRICES_USD.facebookPost;
  if (c.categoryExclusivity) t += ADD_ON_PRICES_USD.categoryExclusivityMonthly;
  return t;
}

export interface AddOnLineItem {
  id: string;
  label: string;
  quantity: number;
  unitUsd: number;
  lineTotalUsd: number;
}

export function buildAddOnLineItems(a: AddOnQuantities): AddOnLineItem[] {
  const c = clampAddOns(a);
  const rows: AddOnLineItem[] = [];
  if (c.sponsoredArticles > 0) {
    rows.push({
      id: "sponsored_article",
      label: "Sponsored article",
      quantity: c.sponsoredArticles,
      unitUsd: ADD_ON_PRICES_USD.sponsoredArticle,
      lineTotalUsd: c.sponsoredArticles * ADD_ON_PRICES_USD.sponsoredArticle,
    });
  }
  if (c.newsletterMentions > 0) {
    rows.push({
      id: "newsletter_mention",
      label: "Newsletter mention",
      quantity: c.newsletterMentions,
      unitUsd: ADD_ON_PRICES_USD.newsletterMention,
      lineTotalUsd: c.newsletterMentions * ADD_ON_PRICES_USD.newsletterMention,
    });
  }
  if (c.newsletterSpotlights > 0) {
    rows.push({
      id: "newsletter_spotlight",
      label: "Newsletter spotlight",
      quantity: c.newsletterSpotlights,
      unitUsd: ADD_ON_PRICES_USD.newsletterSpotlight,
      lineTotalUsd: c.newsletterSpotlights * ADD_ON_PRICES_USD.newsletterSpotlight,
    });
  }
  if (c.facebookPosts > 0) {
    rows.push({
      id: "facebook_post",
      label: "Facebook sponsored post",
      quantity: c.facebookPosts,
      unitUsd: ADD_ON_PRICES_USD.facebookPost,
      lineTotalUsd: c.facebookPosts * ADD_ON_PRICES_USD.facebookPost,
    });
  }
  if (c.categoryExclusivity) {
    rows.push({
      id: "category_exclusivity",
      label: "Category exclusivity",
      quantity: 1,
      unitUsd: ADD_ON_PRICES_USD.categoryExclusivityMonthly,
      lineTotalUsd: ADD_ON_PRICES_USD.categoryExclusivityMonthly,
    });
  }
  return rows;
}

export interface PackageQuoterResult {
  pkg: AdPackageDefinition;
  /** List price before traffic index */
  basePackagePriceUsd: number;
  /** After index (or same as base when index off) */
  indexedPackagePriceUsd: number;
  trafficIndexActive: boolean;
  /** Multiplier applied to package price (1 when index off) */
  packageTrafficMultiplier: number;
  monthlySiteViewsUsed: number | null;
  addOnsMonthlyUsd: number;
  addOnLineItems: AddOnLineItem[];
  /** Package + add-ons per month */
  monthlyTotalUsd: number;
  campaignMonths: 1 | 2 | 3;
  campaignTotalUsd: number;
  impressionsPerMonth: number;
  impressionsCampaignTotal: number;
  baseCpmUsd: number;
  indexedCpmUsd: number;
}

export function computePackageQuoter(
  packageId: AdPackageId,
  addOns: AddOnQuantities,
  campaignMonths: 1 | 2 | 3,
  monthlySiteViews: number | null,
  trafficIndexActive: boolean,
): PackageQuoterResult | null {
  const pkg = getPackageById(packageId);
  if (!pkg) return null;
  const base = pkg.basePriceUsd;
  const indexedPkg = indexedPackagePriceUsd(base, monthlySiteViews, trafficIndexActive);
  const packageTrafficMultiplier =
    base > 0 ? Math.round((indexedPkg / base) * 1000) / 1000 : 1;
  const addMonthly = addOnMonthlyTotalUsd(addOns);
  const lines = buildAddOnLineItems(addOns);
  const monthly = indexedPkg + addMonthly;
  const campaign = monthly * campaignMonths;
  const impMo = pkg.impressionsPerMonth;
  const impCamp = impMo * campaignMonths;
  const idxCpm = impMo > 0 ? (indexedPkg / impMo) * 1000 : 0;

  return {
    pkg,
    basePackagePriceUsd: base,
    indexedPackagePriceUsd: indexedPkg,
    trafficIndexActive,
    packageTrafficMultiplier,
    monthlySiteViewsUsed: monthlyIndexViewsForDisplay(monthlySiteViews, trafficIndexActive),
    addOnsMonthlyUsd: addMonthly,
    addOnLineItems: lines,
    monthlyTotalUsd: monthly,
    campaignMonths,
    campaignTotalUsd: campaign,
    impressionsPerMonth: impMo,
    impressionsCampaignTotal: impCamp,
    baseCpmUsd: pkg.baseCpmUsd,
    indexedCpmUsd: Math.round(idxCpm * 100) / 100,
  };
}

function monthlyIndexViewsForDisplay(
  monthlySiteViews: number | null,
  trafficIndexActive: boolean,
): number | null {
  if (!trafficIndexActive) return null;
  if (monthlySiteViews == null || monthlySiteViews < 1) return null;
  return monthlySiteViews;
}

export interface PackageQuoterPersistedV2 {
  quoterVersion: 2;
  packageId: AdPackageId;
  campaignMonths: 1 | 2 | 3;
  addOns: AddOnQuantities;
}

export function isPackageQuoterV2(data: unknown): data is PackageQuoterPersistedV2 {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return o.quoterVersion === 2 && typeof o.packageId === "string";
}

function clampCampaignMonths(n: unknown): 1 | 2 | 3 {
  const v = Number(n);
  if (v === 2) return 2;
  if (v === 3) return 3;
  return 1;
}

export function packageQuoterFromJson(data: unknown): PackageQuoterPersistedV2 | null {
  if (!isPackageQuoterV2(data)) return null;
  if (!getPackageById(String((data as PackageQuoterPersistedV2).packageId))) return null;
  const add = (data as PackageQuoterPersistedV2).addOns;
  const a = add && typeof add === "object" ? add : defaultAddOns();
  return {
    quoterVersion: 2,
    packageId: data.packageId as AdPackageId,
    campaignMonths: clampCampaignMonths(data.campaignMonths),
    addOns: clampAddOns({
      sponsoredArticles: Number((a as AddOnQuantities).sponsoredArticles) || 0,
      newsletterMentions: Number((a as AddOnQuantities).newsletterMentions) || 0,
      newsletterSpotlights: Number((a as AddOnQuantities).newsletterSpotlights) || 0,
      facebookPosts: Number((a as AddOnQuantities).facebookPosts) || 0,
      categoryExclusivity: Boolean((a as AddOnQuantities).categoryExclusivity),
    }),
  };
}

export function slotLabelsForPackage(pkg: AdPackageDefinition): string[] {
  return pkg.slotIds.map((id) => getAdSlotTableLabel(id));
}

/** Plain proposal text for a saved row (v2 only; legacy quotes return null). */
export function buildProposalTextFromSavedQuote(row: SavedAdQuote): string | null {
  const v2 = packageQuoterFromJson(row.package_data);
  if (!v2) return null;
  const mv = row.monthly_views_snapshot ?? null;
  const trafficIndexActive = mv != null && mv > 0;
  const result = computePackageQuoter(v2.packageId, v2.addOns, v2.campaignMonths, mv, trafficIndexActive);
  if (!result) return null;
  return buildProposalSummaryText({
    advertiserName: row.client_name?.trim() ?? "",
    result,
  });
}

export function buildProposalSummaryText(params: {
  advertiserName: string;
  result: PackageQuoterResult;
}): string {
  const { advertiserName, result } = params;
  const lines: string[] = [];
  lines.push("SPRING-FORD PRESS — ADVERTISING PROPOSAL (DRAFT)");
  lines.push("");
  lines.push(`Advertiser: ${advertiserName.trim() || "________________"}`);
  lines.push("Publisher: Spring-Ford Press");
  lines.push("");
  lines.push(`Package: ${result.pkg.name}`);
  lines.push("Included placements:");
  for (const label of slotLabelsForPackage(result.pkg)) {
    lines.push(`  • ${label}`);
  }
  lines.push("");
  lines.push(
    `Package (published): $${result.basePackagePriceUsd.toLocaleString()}/mo` +
      (result.trafficIndexActive && result.indexedPackagePriceUsd > result.basePackagePriceUsd
        ? ` → traffic-adjusted $${result.indexedPackagePriceUsd.toLocaleString()}/mo (above baseline traffic)`
        : ""),
  );
  if (result.addOnLineItems.length > 0) {
    lines.push("Add-ons (monthly):");
    for (const row of result.addOnLineItems) {
      lines.push(
        `  • ${row.label}${row.quantity > 1 ? ` × ${row.quantity}` : ""}: $${row.lineTotalUsd.toLocaleString()}`,
      );
    }
  } else {
    lines.push("Add-ons: None");
  }
  lines.push("");
  lines.push(`Monthly investment: $${result.monthlyTotalUsd.toLocaleString()}`);
  lines.push(`Campaign length: ${result.campaignMonths} month${result.campaignMonths === 1 ? "" : "s"}`);
  lines.push(`Total campaign investment: $${result.campaignTotalUsd.toLocaleString()}`);
  lines.push("");
  lines.push(
    `Impressions (per month, package): ${result.impressionsPerMonth.toLocaleString()}; campaign total: ${result.impressionsCampaignTotal.toLocaleString()}`,
  );
  lines.push(
    `CPM (package, indexed): $${result.indexedCpmUsd.toFixed(2)}` +
      (result.trafficIndexActive
        ? ` (reference list CPM at rate card: $${result.baseCpmUsd.toFixed(2)})`
        : ` (list CPM: $${result.baseCpmUsd.toFixed(2)})`),
  );
  if (result.addOnLineItems.some((x) => x.id === "category_exclusivity")) {
    lines.push("");
    lines.push("Note: Category exclusivity is included for the selected category for this campaign.");
  }
  lines.push("");
  lines.push(
    "Published package rates apply when trailing traffic is at or below the site baseline; above baseline, package price may increase at renewal (never below published). Add-ons are flat. Your ad runs exclusively in the selected slot — no rotation, no competing ads. Creative is built by the Spring-Ford Press team.",
  );
  lines.push("");
  lines.push("Accepted by (Advertiser): ________________________________  Date: __________");
  lines.push("Accepted by (Spring-Ford Press): ________________________________  Date: __________");
  return lines.join("\n");
}
