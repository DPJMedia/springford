"use client";

import { useEffect, useMemo } from "react";
import { isWebpackChunkLoadError } from "@/lib/errors/isWebpackChunkLoadError";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const staleChunk = useMemo(() => isWebpackChunkLoadError(error), [error]);

  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  const handleRetry = () => {
    if (staleChunk) {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <html lang="en">
      <body className="bg-[color:var(--color-surface)] text-[color:var(--color-dark)] antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-[color:var(--color-medium)]">
            {staleChunk
              ? "A script failed to load—often after the dev server rebuilt. Reload the page to fetch a fresh copy."
              : "Please try again or return to the home page."}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-lg bg-[color:var(--color-riviera-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {staleChunk ? "Reload page" : "Try again"}
          </button>
        </div>
      </body>
    </html>
  );
}
