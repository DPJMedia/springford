"use client";
import { useEffect, useRef } from "react";
export function useDialogFocus(open: boolean, onDismiss: () => void) {
  const root = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = root.current;
    if (!element) return;
    const getItems = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]',
        ),
      ).filter((e) => e.getClientRects().length);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (getItems()[0] || element).focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss.current();
      }
      if (e.key !== "Tab") return;
      const items = getItems();
      const first = items[0],
        last = items.at(-1);
      if (!first) {
        e.preventDefault();
        element!.focus();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !element!.contains(document.activeElement))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !element!.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return root;
}
