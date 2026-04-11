"use client";

import { useMemo } from "react";
import type { TransactionalEmailPreview } from "@/lib/emails/transactionalPreviews";

/** Short labels for the sidebar; full `p.title` still used in the main preview header. */
const PREVIEW_LIST_LABELS: Record<string, string> = {
  "newsletter-subscribe-welcome": "Subscription Confirmation",
  "newsletter-unsubscribe-confirmation": "Unsubscribe Confirmation",
  "support-thank-you-one-time": "One-Time Donation",
  "support-thank-you-one-time-no-receipt": "One-Time (No Receipt URL)",
  "support-thank-you-recurring": "Recurring (Monthly, Full)",
  "support-thank-you-recurring-no-cancel-link": "Recurring (No Email Cancel Link)",
  "support-thank-you-recurring-annual": "Recurring (Annual)",
  "support-cancel-confirmation": "Recurring Canceled",
};

function listButtonLabel(p: TransactionalEmailPreview): string {
  const mapped = PREVIEW_LIST_LABELS[p.id];
  if (mapped) return mapped;
  const raw = p.title.replace(/^Support\s*[—–-]\s*/i, "").trim();
  return raw
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function TypeButton({
  p,
  selectedId,
  onSelect,
}: {
  p: TransactionalEmailPreview;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(p.id)}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        selectedId === p.id
          ? "bg-[var(--admin-accent)]/20 text-[var(--admin-accent)]"
          : "text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
      }`}
    >
      {listButtonLabel(p)}
    </button>
  );
}

export function TransactionalEmailTypesList({
  selectedId,
  onSelect,
  previews,
  /** No outer card — for embedding in AdminActionsPanel (sidebar). */
  embedded = false,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  previews: TransactionalEmailPreview[];
  embedded?: boolean;
}) {
  const { newsletter, support } = useMemo(() => {
    const newsletter = previews.filter((p) => p.id.startsWith("newsletter-"));
    const support = previews.filter((p) => p.id.startsWith("support-"));
    return { newsletter, support };
  }, [previews]);

  if (previews.length === 0) return null;

  const inner = (
    <>
      <div className="space-y-4">
        {newsletter.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
              Newsletter
            </p>
            <ul className="space-y-1">
              {newsletter.map((p) => (
                <li key={p.id}>
                  <TypeButton p={p} selectedId={selectedId} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {support.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
              Support
            </p>
            <ul className="space-y-1">
              {support.map((p) => (
                <li key={p.id}>
                  <TypeButton p={p} selectedId={selectedId} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p
        className={`text-xs text-[var(--admin-text-muted)] ${
          embedded ? "mt-3 border-t border-[var(--admin-border)] pt-3" : "mt-4 border-t border-[var(--admin-border)] pt-3"
        }`}
      >
        Auth emails (sign-up, password reset) are configured in the Supabase Dashboard → Authentication → Email templates.
      </p>
    </>
  );

  if (embedded) {
    return <div className="w-full min-w-0">{inner}</div>;
  }

  return (
    <div className="w-full min-w-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-3">
      {inner}
    </div>
  );
}

export function TransactionalEmailsMain({
  selectedId,
  onSelectId,
  previews,
  className,
}: {
  selectedId: string;
  onSelectId: (id: string) => void;
  previews: TransactionalEmailPreview[];
  /** Root wrapper; default `mt-12` — use `mt-0` when placed in a layout that supplies vertical gap (e.g. newsletter grid). */
  className?: string;
}) {
  const selected = previews.find((p) => p.id === selectedId) ?? previews[0];
  const previewHtml = selected?.getHtml() ?? "";

  if (previews.length === 0) return null;

  return (
    <div className={className ?? "mt-12"}>
      <h2 className="text-xl font-semibold text-white mb-6">Transactional Emails</h2>

      <div className="xl:hidden mb-6">
        <TransactionalEmailTypesList selectedId={selectedId} onSelect={onSelectId} previews={previews} />
      </div>

      <div className="min-w-0 space-y-4">
        {selected && (
          <>
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4">
              <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{selected.description}</p>
              <p className="mt-3 text-sm leading-snug text-[var(--admin-text)]">
                <span className="font-semibold text-[var(--admin-text-muted)]">Subject: </span>
                {selected.subject}
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-[var(--admin-border)] shadow-inner">
              <div className="border-b border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-xs text-[var(--admin-text-muted)]">
                Preview (same HTML as SendGrid)
              </div>
              <div
                className="transactional-email-preview max-h-[min(720px,80vh)] overflow-auto bg-[#e8e8e8]"
                // eslint-disable-next-line react/no-danger -- admin-only preview of our own email HTML
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
