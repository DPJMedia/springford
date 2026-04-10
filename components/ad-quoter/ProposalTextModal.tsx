"use client";

import type { SavedAdQuote } from "@/lib/types/database";

type Props = {
  row: SavedAdQuote;
  body: string | null;
  legacyMessage: string;
  onClose: () => void;
};

export function ProposalTextModal({ row, body, legacyMessage, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-text-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] shadow-xl">
        <div className="border-b border-[var(--admin-border)] px-6 py-4">
          <h2 id="proposal-text-title" className="text-lg font-semibold text-[var(--admin-text)]">
            Proposal text
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{row.name}</p>
        </div>
        <div className="max-h-[min(70vh,520px)] overflow-y-auto px-6 py-4">
          {body ? (
            <textarea
              readOnly
              value={body}
              rows={20}
              className="w-full resize-none rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-3 py-2 text-xs font-mono leading-relaxed text-[var(--admin-text)]"
            />
          ) : (
            <p className="text-sm leading-relaxed text-[var(--admin-text-muted)]">{legacyMessage}</p>
          )}
        </div>
        <div className="flex justify-end border-t border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-6 py-4">
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
  );
}
