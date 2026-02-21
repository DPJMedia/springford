"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function buildCallbackUrl(returnTo?: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  return `${origin}/auth/callback${params.toString() ? `?${params.toString()}` : ""}`;
}

async function signInWithGoogle(returnTo?: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildCallbackUrl(returnTo),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) {
    alert("Error signing in with Google: " + error.message);
  }
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(returnTo);
      router.refresh();
    }
  };

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
            Sign in to access your account
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-soft ring-1 ring-[color:var(--color-border)]">
          {/* Google Sign In */}
          <button
            type="button"
            onClick={() => signInWithGoogle(returnTo)}
            className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-[color:var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition mb-4"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[color:var(--color-border)]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-[color:var(--color-medium)]">Or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1"
              >
                Email
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
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-xs text-[color:var(--color-medium)] hover:text-[color:var(--color-riviera-blue)] font-semibold"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-[color:var(--color-medium)] mb-3">
              Don't have an account?
            </p>
            <Link
              href={returnTo !== "/" ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : "/signup"}
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-[color:var(--color-riviera-blue)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-riviera-blue)] hover:bg-[color:var(--color-riviera-blue)] hover:text-white transition"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

