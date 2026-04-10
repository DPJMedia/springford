"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[color:var(--color-surface)] text-[color:var(--color-dark)] antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-[color:var(--color-medium)]">
            Please try again or return to the home page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-[color:var(--color-riviera-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
