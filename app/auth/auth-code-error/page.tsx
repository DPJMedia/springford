"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AuthCodeErrorPage() {
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Parse error from URL hash
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash);
    
    const details = {
      error: params.get('error'),
      errorCode: params.get('error_code'),
      errorDescription: params.get('error_description'),
    };
    
    setErrorDetails(details);
    setIsExpired(details.errorCode === 'otp_expired');
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg p-8 shadow-soft ring-1 ring-[color:var(--color-border)] text-center">
          <div className="text-5xl mb-4">⚠️</div>
          
          <h2 className="text-2xl font-semibold text-[color:var(--color-dark)] mb-3">
            {isExpired ? "Confirmation Link Expired" : "Authentication Error"}
          </h2>
          
          <p className="text-sm text-[color:var(--color-medium)] mb-6 leading-relaxed">
            {isExpired ? (
              <>
                Your email confirmation link has expired or has already been used. 
                Email confirmation links are only valid for 24 hours and can only be used once.
              </>
            ) : (
              <>
                There was an error confirming your email. The link may be invalid or expired.
              </>
            )}
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              What to do next:
            </p>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Try logging in with your email and password</li>
              <li>If login doesn't work, sign up again to get a fresh confirmation email</li>
              <li>Click the new confirmation link within 24 hours</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90 transition"
            >
              Try Logging In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full border-2 border-[color:var(--color-border)] px-6 py-2.5 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition"
            >
              Sign Up Again
            </Link>
            <Link
              href="/"
              className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
            >
              ← Back to home
            </Link>
          </div>

          {errorDetails?.errorDescription && (
            <div className="mt-6 pt-6 border-t border-[color:var(--color-border)]">
              <p className="text-xs text-[color:var(--color-medium)]">
                Error: {errorDetails.errorDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

