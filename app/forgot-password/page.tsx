"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg p-8 shadow-soft ring-1 ring-[color:var(--color-border)] text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-2xl font-semibold text-[color:var(--color-dark)] mb-3">
              Check Your Email!
            </h2>
            <p className="text-sm text-[color:var(--color-medium)] mb-4 leading-relaxed">
              We've sent a password reset link to:
            </p>
            <p className="text-sm font-semibold text-[color:var(--color-dark)] bg-gray-50 px-4 py-2 rounded-md mb-4">
              {email}
            </p>
            <p className="text-sm text-[color:var(--color-medium)] leading-relaxed">
              Click the link in your email to reset your password. The link will expire in 1 hour.
            </p>
            <div className="mt-6 pt-6 border-t border-[color:var(--color-border)]">
              <p className="text-xs text-[color:var(--color-medium)]">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-[color:var(--color-riviera-blue)] hover:underline font-semibold"
                >
                  try again
                </button>
              </p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
            >
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="masthead text-3xl font-black text-[color:var(--color-dark)]">
              Spring-Ford Press
            </h1>
          </Link>
          <p className="text-sm text-[color:var(--color-medium)] mt-2">
            Reset your password
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-soft ring-1 ring-[color:var(--color-border)]">
          <form onSubmit={handleResetRequest} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
                placeholder="you@example.com"
              />
              <p className="text-xs text-[color:var(--color-medium)] mt-1">
                Enter the email address associated with your account
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2b7a92] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-[color:var(--color-medium)]">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

