"use client";

import {
  BASELINE_MONTHLY_SITE_VIEWS,
  computeQuote,
  packageFromJson,
} from "@/lib/advertising/quoteModel";
import { formatCampaignRange, formatSavedQuoteUpdatedAt } from "@/lib/advertising/formatQuoteDates";
import type { SavedAdQuote } from "@/lib/types/database";

type Props = {
  row: SavedAdQuote;
  onClose: () => void;
  onDelete: (row: SavedAdQuote) => void | Promise<void>;
};

function quoteForSavedRow(row: SavedAdQuote) {
  const pkg = packageFromJson(row.package_data);
  const views = row.monthly_views_snapshot ?? BASELINE_MONTHLY_SITE_VIEWS;
  const h = row.homepage_views_snapshot ?? 0;
  const a = row.article_views_snapshot ?? 0;
  const viewMix = h + a > 0 ? { homepageViews: h, articleViews: a } : undefined;
  return computeQuote(pkg, views, viewMix);
}

export function SavedQuoteDocumentModal({ row, onClose, onDelete }: Props) {
  const computed = quoteForSavedRow(row);
  const manual = row.manual_total_override === true;
  const hasViewMixSnapshot = (row.homepage_views_snapshot ?? 0) + (row.article_views_snapshot ?? 0) > 0;
  const views = row.monthly_views_snapshot ?? BASELINE_MONTHLY_SITE_VIEWS;

  const savedDiffers =
    !manual &&
    row.total_usd != null &&
    hasViewMixSnapshot &&
    Math.abs(row.total_usd - computed.totalUsd) > 2;

  async function confirmDelete() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${row.name}"? This cannot be undone.`)
    ) {
      return;
    }
    await onDelete(row);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-doc-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 bg-gradient-to-br from-slate-50 to-white px-8 py-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-medium)]">
            Advertisement quote
          </p>
          <h2
            id="quote-doc-title"
            className="mt-2 text-2xl font-black tracking-tight text-[color:var(--color-dark)]"
          >
            {row.name}
          </h2>
          <p className="mt-3 text-lg text-[color:var(--color-dark)]">
            <span className="font-semibold text-[color:var(--color-medium)]">Client: </span>
            {row.client_name?.trim() || "—"}
          </p>
        </div>

        <div className="space-y-8 px-8 py-8 text-[color:var(--color-dark)]">
          <section>
            <h3 className="text-xs font-black uppercase tracking-wide text-[color:var(--color-medium)]">
              Campaign
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                <dt className="text-[color:var(--color-medium)]">Campaign period</dt>
                <dd className="max-w-[70%] text-right font-semibold leading-snug">
                  {formatCampaignRange(row.start_date, row.end_date)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 pb-1">
                <dt className="text-[color:var(--color-medium)]">Last saved</dt>
                <dd className="text-right text-sm">{formatSavedQuoteUpdatedAt(row.updated_at)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-wide text-[color:var(--color-medium)]">
              Investment
            </h3>
            <p className="mt-3 text-4xl font-black tabular-nums text-[color:var(--color-riviera-blue)]">
              ${(row.total_usd ?? 0).toLocaleString()}
            </p>
            {!manual && (
              <p className="mt-1 text-xs text-[color:var(--color-medium)]">
                Total quoted (as saved). Package math used traffic index ×
                {computed.viewershipMultiplier.toFixed(3)}, {views.toLocaleString()} views/mo
                {hasViewMixSnapshot && (
                  <>
                    {" "}
                    (homepage {row.homepage_views_snapshot?.toLocaleString()} · article{" "}
                    {row.article_views_snapshot?.toLocaleString()} in 30d mix)
                  </>
                )}
                .
              </p>
            )}
            {manual && (
              <p className="mt-1 text-xs text-[color:var(--color-medium)]">
                Custom total — not tied to the line-item calculator below. Components are listed for
                reference only.
              </p>
            )}
            {savedDiffers && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
                Recalculating this package with today&apos;s code gives{" "}
                <strong>${computed.totalUsd.toLocaleString()}</strong> — rates or logic may have
                changed since save.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-wide text-[color:var(--color-medium)]">
              Package includes
            </h3>
            <ul className="mt-4 space-y-3">
              {computed.lineItems.length === 0 ? (
                <li className="text-sm text-[color:var(--color-medium)]">No line items</li>
              ) : manual ? (
                computed.lineItems.map((line) => (
                  <li key={line.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <p className="font-semibold">{line.label}</p>
                    <p className="text-xs text-[color:var(--color-medium)]">{line.detail}</p>
                  </li>
                ))
              ) : (
                computed.lineItems.map((line) => (
                  <li
                    key={line.id}
                    className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-semibold">{line.label}</p>
                      <p className="text-xs text-[color:var(--color-medium)]">{line.detail}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">
                      ${line.lineSubtotalUsd.toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
            {!manual && (
              <div className="mt-4 flex justify-between border-t-2 border-gray-200 pt-4 text-sm">
                <span className="font-bold uppercase tracking-wide text-[color:var(--color-medium)]">
                  Subtotal (baseline)
                </span>
                <span className="font-bold tabular-nums">
                  ${computed.subtotalBaselineUsd.toLocaleString()}
                </span>
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-slate-50/80 px-8 py-4">
          <button
            type="button"
            onClick={() => void confirmDelete()}
            className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Delete quote
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[color:var(--color-riviera-blue)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
