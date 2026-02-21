"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_LENGTH = 3;

function SetUsernameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || searchParams.get("next") || "/";
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?returnTo=${encodeURIComponent("/auth/set-username" + (returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""))}`);
        return;
      }
      setUserId(user.id);
      setAuthChecked(true);
    })();
  }, [router, supabase.auth, returnTo]);

  async function checkAvailability(value: string): Promise<boolean> {
    if (!value || value.length < MIN_LENGTH) return true;
    const { data } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("username", value.trim())
      .maybeSingle();
    return !data; // available if no row has this username
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = username.trim();

    if (trimmed.length < MIN_LENGTH) {
      setError(`Username must be at least ${MIN_LENGTH} characters`);
      return;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    setChecking(true);
    const available = await checkAvailability(trimmed);
    setChecking(false);
    if (!available) {
      setError("This username is already taken");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ username: trimmed })
      .eq("id", userId);

    if (updateError) {
      if (updateError.code === "23505") setError("This username is already taken");
      else setError(updateError.message || "Failed to set username");
      setLoading(false);
      return;
    }

    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    const url = path === "/" ? "/auth/confirm" : `${path}${path.includes("?") ? "&" : "?"}welcome=1`;
    router.replace(url);
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
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
        </div>
        <div className="bg-white rounded-lg p-8 shadow-soft ring-1 ring-[color:var(--color-border)]">
          <div className="text-4xl mb-4 text-center">👋</div>
          <h2 className="text-xl font-semibold text-[color:var(--color-dark)] mb-2 text-center">
            Account creation almost done
          </h2>
          <p className="text-sm text-[color:var(--color-medium)] mb-6 text-center">
            Select your username. It will be used for your profile URL and byline.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                autoComplete="username"
                placeholder="johndoe"
                className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
                disabled={loading}
              />
              <p className="text-xs text-[color:var(--color-medium)] mt-1">
                Letters, numbers, and underscores only. At least {MIN_LENGTH} characters.
              </p>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || checking || username.trim().length < MIN_LENGTH}
              className="w-full rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2b7a92] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving…" : checking ? "Checking…" : "Continue"}
            </button>
          </form>
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

export default function SetUsernamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
        </div>
      }
    >
      <SetUsernameContent />
    </Suspense>
  );
}
