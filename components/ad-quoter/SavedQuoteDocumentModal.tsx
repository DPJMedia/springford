"use client";

import { BASELINE_MONTHLY_SITE_VIEWS, computeQuote, packageFromJson } from "@/lib/advertising/quoteModel";
import {
  computePackageQuoter,
  packageQuoterFromJson,
} from "@/lib/advertising/packageQuoterModel";
import { getAdSlotTableLabel } from "@/lib/advertising/adSlots";
import Link from "next/link";
import { formatCampaignRange, formatSavedQuoteUpdatedAt } from "@/lib/advertising/formatQuoteDates";
import type { SavedAdQuote } from "@/lib/types/database";

type Props = {
  row: SavedAdQuote;
  onClose: () => void;
  onDelete: (row: SavedAdQuote) => void | Promise<void>;
  onViewProposalText?: (row: SavedAdQuote) => void;
};

export function SavedQuoteDocumentModal({ row, onClose, onDelete, onViewProposalText }: Props) {
  const v2 = packageQuoterFromJson(row.package_data);
  const monthlyViews = row.monthly_views_snapshot ?? null;
  const trafficIndexActive = monthlyViews != null && monthlyViews > 0;

  async function confirmDelete() {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${row.name}"? This cannot be undone.`)) {
      return;
    }
    await onDelete(row);
    onClose();
  }

  const legacyPkg = !v2 ? packageFromJson(row.package_data) : null;
  const legacyComputed =
    legacyPkg != null
      ? computeQuote(
          legacyPkg,
          row.monthly_views_snapshot ?? BASELINE_MONTHLY_SITE_VIEWS,
          (row.homepage_views_snapshot ?? 0) + (row.article_views_snapshot ?? 0) > 0
            ? {
                homepageViews: row.homepage_views_snapshot ?? 0,
                articleViews: row.article_views_snapshot ?? 0,
              }
            : undefined,
        )
      : null;

  const v2Result =
    v2 != null
      ? computePackageQuoter(v2.packageId, v2.addOns, v2.campaignMonths, monthlyViews, trafficIndexActive)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-doc-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] shadow-2xl">
        <div className="border-b border-[var(--admin-border)] px-6 py-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--admin-text-muted)]">
            Advertisement quote
          </p>
          <h2 id="quote-doc-title" className="mt-2 text-2xl font-semibold tracking-tight text-[var(--admin-text)]">
            {row.name}
          </h2>
          <p className="mt-3 text-sm text-[var(--admin-text)]">
            <span className="font-semibold text-[var(--admin-text-muted)]">Client: </span>
            {row.client_name?.trim() || "—"}
          </p>
        </div>

        <div className="space-y-6 px-6 py-6 text-[var(--admin-text)]">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">Campaign</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--admin-border)] pb-2">
                <dt className="text-[var(--admin-text-muted)]">Campaign period</dt>
                <dd className="max-w-[70%] text-right font-medium leading-snug">
                  {formatCampaignRange(row.start_date, row.end_date)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-text-muted)]">Last saved</dt>
                <dd className="text-right text-sm">{formatSavedQuoteUpdatedAt(row.updated_at)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">Investment</h3>
            <p className="mt-3 text-4xl font-bold tabular-nums text-[var(--admin-accent)]">
              ${(row.total_usd ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[var(--admin-text-muted)]">Total campaign (as saved)</p>
          </section>

          {v2 && v2Result ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Package (v2 calculator)
              </h3>
              <p className="mt-2 font-semibold">{v2Result.pkg.name}</p>
              <ul className="mt-2 list-inside list-disc text-sm text-[var(--admin-text-muted)]">
                {v2Result.pkg.slotIds.map((id) => (
                  <li key={id}>{getAdSlotTableLabel(id)}</li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>List package / mo</dt>
                  <dd className="tabular-nums">${v2Result.basePackagePriceUsd.toLocaleString()}</dd>
                </div>
                {v2Result.trafficIndexActive ? (
                  <div className="flex justify-between gap-4">
                    <dt>Indexed package / mo</dt>
                    <dd className="tabular-nums text-[var(--admin-accent)]">
                      ${v2Result.indexedPackagePriceUsd.toLocaleString()}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt>Campaign length</dt>
                  <dd>
                    {v2Result.campaignMonths} month{v2Result.campaignMonths === 1 ? "" : "s"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>CPM (indexed)</dt>
                  <dd className="tabular-nums">${v2Result.indexedCpmUsd.toFixed(2)}</dd>
                </div>
              </dl>
              {v2Result.addOnLineItems.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-[var(--admin-border)] pt-4">
                  {v2Result.addOnLineItems.map((line) => (
                    <li key={line.id} className="flex justify-between gap-4 text-sm">
                      <span>
                        {line.label}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                      </span>
                      <span className="tabular-nums">${line.lineTotalUsd.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : legacyComputed ? (
            <section>
              <p className="rounded-lg bg-[var(--admin-table-header-bg)] px-3 py-2 text-xs text-[var(--admin-text-muted)]">
                This quote was saved with the <strong className="text-[var(--admin-text)]">previous</strong> line-item
                calculator. Line items below are reconstructed from saved data.
              </p>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Package includes
              </h3>
              <ul className="mt-3 space-y-3">
                {legacyComputed.lineItems.length === 0 ? (
                  <li className="text-sm text-[var(--admin-text-muted)]">No line items</li>
                ) : (
                  legacyComputed.lineItems.map((line) => (
                    <li
                      key={line.id}
                      className="flex justify-between gap-4 border-b border-[var(--admin-border)] pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-semibold">{line.label}</p>
                        <p className="text-xs text-[var(--admin-text-muted)]">{line.detail}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums">${line.lineSubtotalUsd.toLocaleString()}</p>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 flex justify-between border-t border-[var(--admin-border)] pt-4 text-sm">
                <span className="font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                  Subtotal (baseline)
                </span>
                <span className="font-bold tabular-nums">${legacyComputed.subtotalBaselineUsd.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                Traffic index ×{legacyComputed.viewershipMultiplier.toFixed(3)} ·{" "}
                {legacyComputed.monthlySiteViewsUsed.toLocaleString()} views/mo
              </p>
            </section>
          ) : (
            <p className="text-sm text-[var(--admin-text-muted)]">Could not read saved package data.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-6 py-4">
          <button
            type="button"
            onClick={() => void confirmDelete()}
            className="rounded-lg border border-red-500/40 bg-[var(--admin-card-bg)] px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
          >
            Delete quote
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onViewProposalText ? (
              <button
                type="button"
                onClick={() => onViewProposalText(row)}
                className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
              >
                View proposal text
              </button>
            ) : null}
            <Link
              href={`/admin/ad-quoter?edit=${row.id}`}
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/20"
            >
              Edit quote
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[var(--admin-accent)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
