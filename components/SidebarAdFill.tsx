"use client";

import { useEffect, useRef, useState } from "react";
import { AdDisplay } from "@/components/AdDisplay";
import { HOMEPAGE_SIDEBAR_FILL_SLOT_IDS } from "@/lib/advertising/adSlots";

/** Fixed AdDisplay height for a fill slot (see isSidebarFill in AdDisplay). */
const UNIT_HEIGHT = 250;
/** Vertical gap between stacked fill units (matches space-y-8 = 2rem). */
const UNIT_GAP = 32;
const MAX_FILL = HOMEPAGE_SIDEBAR_FILL_SLOT_IDS.length;
const DESKTOP_MQ = "(min-width: 1024px)";

/**
 * Desktop-only: fills the leftover whitespace at the bottom of the homepage sidebar
 * (the aside is shorter than the tall main column) with additional 300x250-ish ad
 * units. It measures the gap between its own top and the main column's bottom and
 * renders only as many units as fit — so it never stretches past the final homepage
 * section, and a shorter tenant simply gets fewer (or zero) units. Unsold fill slots
 * render nothing (hidePlaceholder), so empty inventory shows no gray boxes.
 */
export function SidebarAdFill({
  mainColRef,
}: {
  mainColRef: React.RefObject<HTMLElement | null>;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(DESKTOP_MQ);

    function measure() {
      const fillEl = fillRef.current;
      const mainEl = mainColRef.current;
      if (!fillEl || !mainEl || !mq.matches) {
        setCount(0);
        return;
      }
      // Whitespace available below the existing sidebar content, capped at the
      // main column's bottom edge so the sidebar never grows past it.
      const fillTop = fillEl.getBoundingClientRect().top;
      const mainBottom = mainEl.getBoundingClientRect().bottom;
      const available = mainBottom - fillTop;

      let n = 0;
      if (available >= UNIT_HEIGHT) {
        n = 1 + Math.floor((available - UNIT_HEIGHT) / (UNIT_HEIGHT + UNIT_GAP));
      }
      setCount(Math.max(0, Math.min(MAX_FILL, n)));
    }

    measure();

    // Re-measure when the main column resizes (images/content load in) or the
    // viewport changes. We deliberately do NOT observe the fill container itself —
    // its top is fixed by the content above it, so adding units can't feed back.
    const ro = new ResizeObserver(() => measure());
    if (mainColRef.current) ro.observe(mainColRef.current);
    window.addEventListener("resize", measure);
    // Late content (lazy images, fonts) can shift heights after first paint.
    const t1 = setTimeout(measure, 600);
    const t2 = setTimeout(measure, 1600);
    mq.addEventListener?.("change", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t1);
      clearTimeout(t2);
      mq.removeEventListener?.("change", measure);
    };
  }, [mainColRef]);

  // The container is always mounted (even at count 0) so its top can be measured.
  return (
    <div
      ref={fillRef}
      className={`hidden lg:block ${count > 0 ? "mt-8 space-y-8" : ""}`}
      aria-hidden={count === 0}
    >
      {Array.from({ length: count }).map((_, i) => (
        <AdDisplay
          key={HOMEPAGE_SIDEBAR_FILL_SLOT_IDS[i]}
          adSlot={HOMEPAGE_SIDEBAR_FILL_SLOT_IDS[i]}
          className="w-full"
          hidePlaceholder
        />
      ))}
    </div>
  );
}
