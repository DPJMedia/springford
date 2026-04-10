"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  onCommit: (n: number) => void;
  min: number;
  /** Omit for no upper bound (e.g. large budgets). */
  max?: number;
  /** When the field is left empty on blur. */
  emptyFallback: number;
  /**
   * When true, each valid keystroke updates the parent immediately (live quote).
   * Empty field while typing does not commit until blur.
   */
  liveUpdate?: boolean;
  className?: string;
  id?: string;
};

/**
 * Digits-only numeric field: you can clear it and type a new value without the
 * old `type="number"` snap-back to 0/1 on each keystroke. Uses `type="text"` so
 * browsers never show stepper arrows.
 */
export function NumericTextInput({
  value,
  onCommit,
  min,
  max,
  emptyFallback,
  liveUpdate = false,
  className = "",
  id,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    // While focused, don't sync from props — avoids wiping an empty field or
    // mid-edit text when parent re-renders (e.g. sanitize).
    if (focusedRef.current) return;
    setDraft(null);
  }, [value]);

  const display = draft !== null ? draft : String(value);

  function clampAndParse(raw: string): number {
    let n: number;
    if (raw === "") {
      n = emptyFallback;
    } else {
      n = parseInt(raw, 10);
      if (Number.isNaN(n)) n = emptyFallback;
    }
    if (max !== undefined) n = Math.min(max, Math.max(min, n));
    else n = Math.max(min, n);
    return n;
  }

  function commit(raw: string) {
    const n = clampAndParse(raw);
    setDraft(null);
    onCommit(n);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      spellCheck={false}
      value={display}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "");
        if (liveUpdate && v !== "") {
          const n = clampAndParse(v);
          onCommit(n);
          setDraft(String(n) !== v ? String(n) : v);
          return;
        }
        setDraft(v);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        const raw = e.target.value.replace(/\D/g, "");
        if (draft !== null || liveUpdate) {
          commit(raw);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}
