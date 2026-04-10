"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function QuoteSavedToast({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose(), 4500);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-[min(100%-2rem,24rem)] -translate-x-1/2 justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3 shadow-xl shadow-black/40">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-[var(--admin-text)]">
          Quote saved
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-table-row-hover)] hover:text-[var(--admin-text)]"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
