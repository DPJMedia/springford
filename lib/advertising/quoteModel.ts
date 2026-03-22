/**
 * Advertisement quoter — line items × traffic index.
 * Article placements cost more than homepage (more engagement); mobile article > desktop article.
 * Calibrated reference bundle ≈ $1,100 at index 1.0.
 */

export const BASELINE_MONTHLY_SITE_VIEWS = 12_000;

const VIEWERSHIP_EXPONENT = 0.42;

/** Policy caps */
export const MAX_NEWSLETTER_SENDS_PER_MONTH = 8;
/** Spotlight blocks per month (whole newsletter section) */
export const MAX_NEWSLETTER_SPOTLIGHTS_PER_MONTH = 2;
/** One sponsored/native article per month per advertiser (max = campaign months) */
export function maxSponsoredArticlesForCampaign(durationMonths: number): number {
  return Math.max(0, durationMonths);
}

export function maxSpotlightCountForCampaign(durationMonths: number): number {
  return MAX_NEWSLETTER_SPOTLIGHTS_PER_MONTH * Math.max(1, durationMonths);
}

/**
 * Base rate card (before traffic index). Homepage < article; desktop article < mobile article.
 * Reference preset uses 3× desktop main @ 100 = $300 so 250+360+300+95+95 = $1,100.
 */
export const RATES_USD = {
  sponsoredArticle: 250,
  newsletterSend: 60,
  newsletterSpotlight: 95,
  facebookBoost: 95,
  desktopMainSiteMonth: 100,
  mobileMainSiteMonth: 78,
  desktopArticleMonth: 135,
  mobileArticleMonth: 170,
} as const;

/** Mutable rate card (may differ from `RATES_USD` after view-mix nudges). */
export type RateCard = { [K in keyof typeof RATES_USD]: number };

export type PackageInput = {
  durationMonths: number;
  sponsoredArticleCount: number;
  newsletterSendsPerMonth: number;
  newsletterSpotlightCount: number;
  /** Full campaign: ads on desktop main/home for every month of the quote */
  includeDesktopMainSite: boolean;
  includeMobileMainSite: boolean;
  /** Full campaign: ads on desktop article templates */
  includeDesktopArticle: boolean;
  /** Full campaign: ads on mobile article (premium surface) */
  includeMobileArticle: boolean;
  facebookBoostCount: number;
};

export type LineItem = {
  id: string;
  label: string;
  detail: string;
  quantity: number;
  unitUsd: number;
  lineSubtotalUsd: number;
};

export type QuoteResult = {
  lineItems: LineItem[];
  subtotalBaselineUsd: number;
  viewershipMultiplier: number;
  totalUsd: number;
  monthlySiteViewsUsed: number;
  /** When set, article placements were nudged using homepage vs article view split */
  viewMixNote?: string;
};

export function viewershipMultiplier(monthlySiteViews: number): number {
  if (!monthlySiteViews || monthlySiteViews < 1) return 1;
  const ratio = monthlySiteViews / BASELINE_MONTHLY_SITE_VIEWS;
  const raw = Math.pow(ratio, VIEWERSHIP_EXPONENT);
  return Math.round(Math.min(2.6, Math.max(0.62, raw)) * 1000) / 1000;
}

/**
 * Nudge article placement rates when article views dominate (from analytics).
 * Main-page rates stay fixed so reference calibration stays stable.
 */
export function computeEffectiveRates(
  base: RateCard,
  homepageViews: number,
  articleViews: number,
): { rates: RateCard; note: string | null } {
  const h = Math.max(0, homepageViews);
  const a = Math.max(0, articleViews);
  const t = h + a;
  if (t < 1) {
    return { rates: { ...base }, note: null };
  }
  const artShare = a / t;
  // Up to ~12% boost on article rows when most traffic is article reads
  const articleBoost = 1 + 0.15 * artShare;
  const note = `Article placement rates +${Math.round((articleBoost - 1) * 100)}% (articles are ${(artShare * 100).toFixed(0)}% of tracked homepage+article views)`;
  return {
    rates: {
      ...base,
      desktopArticleMonth: Math.round(base.desktopArticleMonth * articleBoost),
      mobileArticleMonth: Math.round(base.mobileArticleMonth * articleBoost),
    },
    note,
  };
}

export function totalNewsletterSends(input: PackageInput): number {
  return Math.max(0, input.newsletterSendsPerMonth) * Math.max(0, input.durationMonths);
}

export function emptyPackage(durationMonths: number): PackageInput {
  return {
    durationMonths: Math.max(1, durationMonths),
    sponsoredArticleCount: 0,
    newsletterSendsPerMonth: 0,
    newsletterSpotlightCount: 0,
    includeDesktopMainSite: false,
    includeMobileMainSite: false,
    includeDesktopArticle: false,
    includeMobileArticle: false,
    facebookBoostCount: 0,
  };
}

export const REFERENCE_DEAL_PRESET: PackageInput = {
  durationMonths: 3,
  sponsoredArticleCount: 1,
  newsletterSendsPerMonth: 2,
  newsletterSpotlightCount: 1,
  includeDesktopMainSite: true,
  includeMobileMainSite: false,
  includeDesktopArticle: false,
  includeMobileArticle: false,
  facebookBoostCount: 1,
};

/** Clamp to business rules */
export function sanitizePackage(input: PackageInput): PackageInput {
  const d = Math.max(1, Math.min(24, input.durationMonths));
  return {
    durationMonths: d,
    sponsoredArticleCount: Math.min(
      maxSponsoredArticlesForCampaign(d),
      Math.max(0, input.sponsoredArticleCount),
    ),
    newsletterSendsPerMonth: Math.min(
      MAX_NEWSLETTER_SENDS_PER_MONTH,
      Math.max(0, input.newsletterSendsPerMonth),
    ),
    newsletterSpotlightCount: Math.min(
      maxSpotlightCountForCampaign(d),
      Math.max(0, input.newsletterSpotlightCount),
    ),
    includeDesktopMainSite: Boolean(input.includeDesktopMainSite),
    includeMobileMainSite: Boolean(input.includeMobileMainSite),
    includeDesktopArticle: Boolean(input.includeDesktopArticle),
    includeMobileArticle: Boolean(input.includeMobileArticle),
    facebookBoostCount: Math.max(0, input.facebookBoostCount),
  };
}

/**
 * Restore package from JSON (saved quotes). Supports legacy keys with *Months counts.
 */
export function packageFromJson(data: unknown): PackageInput {
  if (!data || typeof data !== "object") return emptyPackage(3);
  const o = data as Record<string, unknown>;
  const d = Math.max(1, Math.min(24, Number(o.durationMonths) || 3));
  const base = emptyPackage(d);
  if (typeof o.includeDesktopMainSite === "boolean" || typeof o.includeMobileMainSite === "boolean") {
    return sanitizePackage({
      ...base,
      durationMonths: d,
      sponsoredArticleCount: Number(o.sponsoredArticleCount) || 0,
      newsletterSendsPerMonth: Number(o.newsletterSendsPerMonth) || 0,
      newsletterSpotlightCount: Number(o.newsletterSpotlightCount) || 0,
      includeDesktopMainSite: Boolean(o.includeDesktopMainSite),
      includeMobileMainSite: Boolean(o.includeMobileMainSite),
      includeDesktopArticle: Boolean(o.includeDesktopArticle),
      includeMobileArticle: Boolean(o.includeMobileArticle),
      facebookBoostCount: Number(o.facebookBoostCount) || 0,
    });
  }
  return sanitizePackage({
    ...base,
    durationMonths: d,
    sponsoredArticleCount: Number(o.sponsoredArticleCount) || 0,
    newsletterSendsPerMonth: Number(o.newsletterSendsPerMonth) || 0,
    newsletterSpotlightCount: Number(o.newsletterSpotlightCount) || 0,
    includeDesktopMainSite: Number(o.desktopMainSiteMonths) > 0,
    includeMobileMainSite: Number(o.mobileMainSiteMonths) > 0,
    includeDesktopArticle: Number(o.desktopArticleMonths) > 0,
    includeMobileArticle: Number(o.mobileArticleMonths) > 0,
    facebookBoostCount: Number(o.facebookBoostCount) || 0,
  });
}

export function buildLineItems(input: PackageInput, rates: RateCard = RATES_USD): LineItem[] {
  const items: LineItem[] = [];
  const n = totalNewsletterSends(input);

  if (input.sponsoredArticleCount > 0) {
    items.push({
      id: "sponsored_article",
      label: "Sponsored / native article",
      detail: "Dedicated article (max 1 / mo / advertiser)",
      quantity: input.sponsoredArticleCount,
      unitUsd: rates.sponsoredArticle,
      lineSubtotalUsd: input.sponsoredArticleCount * rates.sponsoredArticle,
    });
  }
  if (n > 0) {
    items.push({
      id: "newsletter_send",
      label: "Newsletter sends (ads in email)",
      detail: `${input.newsletterSendsPerMonth}/mo × ${input.durationMonths} mo (max ${MAX_NEWSLETTER_SENDS_PER_MONTH}/mo)`,
      quantity: n,
      unitUsd: rates.newsletterSend,
      lineSubtotalUsd: n * rates.newsletterSend,
    });
  }
  if (input.newsletterSpotlightCount > 0) {
    items.push({
      id: "newsletter_spotlight",
      label: "Newsletter spotlight section",
      detail: `Full sponsored block (max ${MAX_NEWSLETTER_SPOTLIGHTS_PER_MONTH}/mo)`,
      quantity: input.newsletterSpotlightCount,
      unitUsd: rates.newsletterSpotlight,
      lineSubtotalUsd: input.newsletterSpotlightCount * rates.newsletterSpotlight,
    });
  }
  const dm = input.durationMonths;
  if (input.includeDesktopMainSite && dm > 0) {
    items.push({
      id: "desktop_main",
      label: "Desktop — homepage & main placements",
      detail: `Full campaign — main & home (${dm} mo × site)`,
      quantity: dm,
      unitUsd: rates.desktopMainSiteMonth,
      lineSubtotalUsd: dm * rates.desktopMainSiteMonth,
    });
  }
  if (input.includeMobileMainSite && dm > 0) {
    items.push({
      id: "mobile_main",
      label: "Mobile — homepage placements",
      detail: `Full campaign — mobile home (${dm} mo)`,
      quantity: dm,
      unitUsd: rates.mobileMainSiteMonth,
      lineSubtotalUsd: dm * rates.mobileMainSiteMonth,
    });
  }
  if (input.includeDesktopArticle && dm > 0) {
    items.push({
      id: "desktop_article",
      label: "Desktop — article page placements",
      detail: `Full campaign — article pages (${dm} mo)`,
      quantity: dm,
      unitUsd: rates.desktopArticleMonth,
      lineSubtotalUsd: dm * rates.desktopArticleMonth,
    });
  }
  if (input.includeMobileArticle && dm > 0) {
    items.push({
      id: "mobile_article",
      label: "Mobile — article placements",
      detail: `Full campaign — mobile articles (${dm} mo)`,
      quantity: dm,
      unitUsd: rates.mobileArticleMonth,
      lineSubtotalUsd: dm * rates.mobileArticleMonth,
    });
  }
  if (input.facebookBoostCount > 0) {
    items.push({
      id: "facebook_boost",
      label: "Sponsored social (Facebook / Meta)",
      detail: "Boosted post",
      quantity: input.facebookBoostCount,
      unitUsd: rates.facebookBoost,
      lineSubtotalUsd: input.facebookBoostCount * rates.facebookBoost,
    });
  }
  return items;
}

export function computeQuote(
  input: PackageInput,
  monthlySiteViews: number,
  viewMix?: { homepageViews: number; articleViews: number },
): QuoteResult {
  const inputClean = sanitizePackage(input);
  let viewMixNote: string | undefined;
  let rates: RateCard = { ...RATES_USD };

  if (
    viewMix &&
    viewMix.homepageViews + viewMix.articleViews > 0
  ) {
    const { rates: r, note } = computeEffectiveRates(RATES_USD, viewMix.homepageViews, viewMix.articleViews);
    rates = r;
    if (note) viewMixNote = note;
  }

  const lineItems = buildLineItems(inputClean, rates);
  const subtotalBaselineUsd = lineItems.reduce((s, row) => s + row.lineSubtotalUsd, 0);
  const m = viewershipMultiplier(monthlySiteViews);
  const totalUsd = Math.round(subtotalBaselineUsd * m);
  return {
    lineItems,
    subtotalBaselineUsd,
    viewershipMultiplier: m,
    totalUsd,
    monthlySiteViewsUsed: monthlySiteViews,
    viewMixNote,
  };
}

export function baselineEquivalentUsd(budgetUsd: number, monthlySiteViews: number): number {
  const m = viewershipMultiplier(monthlySiteViews);
  if (m <= 0) return budgetUsd;
  return Math.round(budgetUsd / m);
}

function baselineSubtotalWithRates(input: PackageInput, rates: RateCard): number {
  return buildLineItems(sanitizePackage(input), rates).reduce((s, r) => s + r.lineSubtotalUsd, 0);
}

function getRatesForFill(
  viewMix?: { homepageViews: number; articleViews: number },
): RateCard {
  if (viewMix && viewMix.homepageViews + viewMix.articleViews > 0) {
    return computeEffectiveRates(RATES_USD, viewMix.homepageViews, viewMix.articleViews).rates;
  }
  return { ...RATES_USD };
}

export function fillPackageToBaselineBudget(
  targetBaselineUsd: number,
  durationMonths: number,
  viewMix?: { homepageViews: number; articleViews: number },
): PackageInput {
  const rates = getRatesForFill(viewMix);
  const d = Math.max(1, durationMonths);
  let remaining = Math.max(0, Math.floor(targetBaselineUsd));
  const p = emptyPackage(d);

  const newsletterTierCost = () => d * rates.newsletterSend;
  const maxSponsored = maxSponsoredArticlesForCampaign(d);
  const maxSpot = maxSpotlightCountForCampaign(d);

  const placementCost = (perMonth: number) => d * perMonth;

  let guard = 0;
  while (remaining > 0 && guard++ < 8000) {
    if (!p.includeMobileMainSite && remaining >= placementCost(rates.mobileMainSiteMonth)) {
      p.includeMobileMainSite = true;
      remaining -= placementCost(rates.mobileMainSiteMonth);
      continue;
    }
    if (!p.includeDesktopMainSite && remaining >= placementCost(rates.desktopMainSiteMonth)) {
      p.includeDesktopMainSite = true;
      remaining -= placementCost(rates.desktopMainSiteMonth);
      continue;
    }
    if (!p.includeDesktopArticle && remaining >= placementCost(rates.desktopArticleMonth)) {
      p.includeDesktopArticle = true;
      remaining -= placementCost(rates.desktopArticleMonth);
      continue;
    }
    if (!p.includeMobileArticle && remaining >= placementCost(rates.mobileArticleMonth)) {
      p.includeMobileArticle = true;
      remaining -= placementCost(rates.mobileArticleMonth);
      continue;
    }
    if (
      p.newsletterSendsPerMonth < MAX_NEWSLETTER_SENDS_PER_MONTH &&
      remaining >= newsletterTierCost()
    ) {
      p.newsletterSendsPerMonth++;
      remaining -= newsletterTierCost();
      continue;
    }
    if (p.newsletterSpotlightCount < maxSpot && remaining >= rates.newsletterSpotlight) {
      p.newsletterSpotlightCount++;
      remaining -= rates.newsletterSpotlight;
      continue;
    }
    if (p.facebookBoostCount < 40 && remaining >= rates.facebookBoost) {
      p.facebookBoostCount++;
      remaining -= rates.facebookBoost;
      continue;
    }
    if (p.sponsoredArticleCount < maxSponsored && remaining >= rates.sponsoredArticle) {
      p.sponsoredArticleCount++;
      remaining -= rates.sponsoredArticle;
      continue;
    }
    break;
  }

  while (
    baselineSubtotalWithRates(p, rates) + rates.sponsoredArticle <= targetBaselineUsd &&
    p.sponsoredArticleCount < maxSponsored
  ) {
    p.sponsoredArticleCount++;
  }

  const sanitized = sanitizePackage(p);
  if (baselineSubtotalWithRates(sanitized, rates) === 0 && targetBaselineUsd > 0) {
    return sanitizePackage({ ...sanitized, sponsoredArticleCount: 1 });
  }
  return sanitized;
}

export function suggestPackageForTotalBudget(
  budgetUsd: number,
  durationMonths: number,
  monthlySiteViews: number,
  viewMix?: { homepageViews: number; articleViews: number },
): PackageInput {
  const m = viewershipMultiplier(monthlySiteViews);
  const targetBaseline = budgetUsd / m;
  return fillPackageToBaselineBudget(targetBaseline, durationMonths, viewMix);
}

export function formatQuoteSummary(result: QuoteResult): string {
  const lines = [
    `Spring-Ford Press — Ad quote`,
    `—`,
    ...result.lineItems.map(
      (r) =>
        `• ${r.label} × ${r.quantity} @ $${r.unitUsd} = $${r.lineSubtotalUsd.toLocaleString()}`,
    ),
    `—`,
    `Baseline subtotal: $${result.subtotalBaselineUsd.toLocaleString()}`,
    `Traffic multiplier: ×${result.viewershipMultiplier.toFixed(3)} (${result.monthlySiteViewsUsed.toLocaleString()} page views, last 30 days)`,
    ...(result.viewMixNote ? [result.viewMixNote] : []),
    `Total: $${result.totalUsd.toLocaleString()}`,
  ];
  return lines.join("\n");
}
