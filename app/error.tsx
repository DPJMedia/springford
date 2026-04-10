"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-[color:var(--color-dark)]">Something went wrong</h1>
      <p className="text-[color:var(--color-medium)]">
        Please try again. If the problem continues, refresh the page.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-[color:var(--color-riviera-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
