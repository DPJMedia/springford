"use client";

import { normalizeVisibility } from "@/lib/articles/visibilityAccess";

type Props = {
  visibility?: string | null;
  /** corner: ribbon-style for cards; inline: pill next to section tags */
  variant?: "corner" | "inline";
  className?: string;
};

export function ArticleAudienceBookmark({
  visibility,
  variant = "corner",
  className = "",
}: Props) {
  const v = normalizeVisibility(visibility);
  if (v === "public") return null;

  const label = v === "newsletter_subscribers" ? "Subscriber only" : "Admin only";
  const isNewsletter = v === "newsletter_subscribers";

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
          isNewsletter ? "bg-[color:var(--color-riviera-blue)]" : "bg-orange-600"
        } ${className}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 border border-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md ${
        isNewsletter
          ? "bg-[color:var(--color-riviera-blue)]"
          : "bg-orange-600"
      } rounded-br-lg rounded-tr-sm ${className}`}
      aria-label={label}
    >
      <svg className="h-3 w-3 opacity-90" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M6 2c-1.1 0-2 .9-2 2v16l7-3 7 3V4c0-1.1-.9-2-2-2H6z" />
      </svg>
      {label}
    </span>
  );
}
