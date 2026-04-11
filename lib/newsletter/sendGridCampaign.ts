import type { TenantRow } from "@/lib/types/database";

/** Per-tenant SendGrid category for newsletter sends (Stats API + Event Webhook). */
export function sendGridNewsletterGlobalCategory(tenant: TenantRow): string {
  return `${tenant.slug}_newsletter`;
}

export function sendGridCategoryForCampaign(campaignId: string): string {
  return `sfpc_${campaignId.replace(/-/g, "")}`;
}

export type SendGridCategoryMetrics = {
  blocks: number;
  bounce_drops: number;
  bounces: number;
  clicks: number;
  deferred: number;
  delivered: number;
  invalid_emails: number;
  opens: number;
  processed: number;
  requests: number;
  spam_report_drops: number;
  spam_reports: number;
  unique_clicks: number;
  unique_opens: number;
  unsubscribe_drops: number;
  unsubscribes: number;
};

export const emptySendGridMetrics = (): SendGridCategoryMetrics => ({
  blocks: 0,
  bounce_drops: 0,
  bounces: 0,
  clicks: 0,
  deferred: 0,
  delivered: 0,
  invalid_emails: 0,
  opens: 0,
  processed: 0,
  requests: 0,
  spam_report_drops: 0,
  spam_reports: 0,
  unique_clicks: 0,
  unique_opens: 0,
  unsubscribe_drops: 0,
  unsubscribes: 0,
});

const ZERO = emptySendGridMetrics();

function addMetricsRow(a: SendGridCategoryMetrics, b: Record<string, number>): void {
  for (const k of Object.keys(ZERO) as (keyof SendGridCategoryMetrics)[]) {
    a[k] += Number(b[k]) || 0;
  }
}

/** Sum daily category stats from GET /v3/categories/stats for one category name. */
export function sumSendGridCategoryStats(
  body: unknown,
  categoryName: string,
): SendGridCategoryMetrics | null {
  if (!Array.isArray(body)) return null;
  const out: SendGridCategoryMetrics = { ...ZERO };
  let found = false;
  for (const day of body) {
    if (!day || typeof day !== "object") continue;
    const stats = (day as { stats?: unknown }).stats;
    if (!Array.isArray(stats)) continue;
    for (const block of stats) {
      if (!block || typeof block !== "object") continue;
      const name = (block as { name?: string }).name;
      if (name !== categoryName) continue;
      const metrics = (block as { metrics?: Record<string, number> }).metrics;
      if (!metrics || typeof metrics !== "object") continue;
      found = true;
      addMetricsRow(out, metrics);
    }
  }
  return found ? out : null;
}

export function mergeMetrics(a: SendGridCategoryMetrics, b: SendGridCategoryMetrics): SendGridCategoryMetrics {
  const out: SendGridCategoryMetrics = { ...ZERO };
  for (const k of Object.keys(ZERO) as (keyof SendGridCategoryMetrics)[]) {
    out[k] = a[k] + b[k];
  }
  return out;
}
