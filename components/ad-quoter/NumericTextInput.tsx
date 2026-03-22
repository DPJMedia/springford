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

  function commit(raw: string) {
    let n: number;
    if (raw === "") {
      n = emptyFallback;
    } else {
      n = parseInt(raw, 10);
      if (Number.isNaN(n)) n = emptyFallback;
    }
    if (max !== undefined) n = Math.min(max, Math.max(min, n));
    else n = Math.max(min, n);
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
        setDraft(v);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        const raw = e.target.value.replace(/\D/g, "");
        // User edited (including clear-to-empty) if draft was ever set this focus session
        if (draft !== null) {
          commit(raw);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={className}
    />
  );
}
