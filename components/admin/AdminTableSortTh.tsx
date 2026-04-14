"use client";

import type { ReactNode } from "react";
import type { SortTriPhase } from "@/lib/admin/tableSort";

const thClass =
  "py-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-text)] align-bottom";
const btnClass =
  "inline-flex w-full min-w-0 items-center gap-1.5 hover:text-[var(--admin-accent)] transition-colors";

function SortGlyph({ phase }: { phase: SortTriPhase }) {
  if (phase === 0) return null;
  return (
    <span className="inline-flex shrink-0 text-[var(--admin-accent)]" aria-hidden>
      {phase === 1 ? (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )}
    </span>
  );
}

export function AdminTableSortTh({
  label,
  phase,
  onClick,
  className = "",
  scope = "col",
  align = "left",
}: {
  label: ReactNode;
  phase: SortTriPhase;
  onClick: () => void;
  className?: string;
  scope?: "col" | "colgroup";
  align?: "left" | "right";
}) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  const btnAlign = align === "right" ? "justify-end" : "justify-start";
  return (
    <th scope={scope} className={`${thClass} ${alignClass} ${className ?? "px-4"}`.trim()}>
      <button type="button" onClick={onClick} className={`${btnClass} ${btnAlign}`}>
        <span className="min-w-0">{label}</span>
        <SortGlyph phase={phase} />
      </button>
    </th>
  );
}

export function AdminTableSortThCompact({
  label,
  phase,
  onClick,
  className = "",
}: {
  label: ReactNode;
  phase: SortTriPhase;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-[var(--admin-text)] ${className}`.trim()}
    >
      <button type="button" onClick={onClick} className={btnClass}>
        <span className="min-w-0">{label}</span>
        <SortGlyph phase={phase} />
      </button>
    </th>
  );
}
