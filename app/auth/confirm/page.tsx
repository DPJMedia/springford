"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect after 2 seconds
    const timer = setTimeout(() => {
      router.push("/");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg p-8 shadow-soft ring-1 ring-[color:var(--color-border)] text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-semibold text-[color:var(--color-dark)] mb-3">
            Thank You for Confirming Your Email!
          </h2>
          <p className="text-sm text-[color:var(--color-medium)] mb-6 leading-relaxed">
            Your account is now active. Redirecting you to the homepage...
          </p>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
        </div>
      </div>
    </div>
  );
}

