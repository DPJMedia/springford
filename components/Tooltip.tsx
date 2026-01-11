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
        className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-500 rounded-full hover:bg-blue-600 transition"
      >
        i
      </button>
      {show && (
        <div className="absolute z-50 left-6 top-0 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
          <div className="absolute -left-2 top-1 w-3 h-3 bg-gray-900 transform rotate-45"></div>
          {text}
        </div>
      )}
    </div>
  );
}

