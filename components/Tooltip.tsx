"use client";

import { useState, useEffect, useRef } from "react";

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    }

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show]);

  return (
    <div className="relative inline-block ml-1" ref={tooltipRef}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.preventDefault();
          setShow(!show);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--admin-accent)] text-[10px] font-bold text-black transition hover:opacity-90"
      >
        i
      </button>
      {show && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2">
          <div className="relative rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-3 text-left text-xs leading-snug text-[var(--admin-text)] shadow-lg">
            <div
              className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[8px] border-x-transparent border-b-[var(--admin-card-bg)]"
              aria-hidden
            />
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

