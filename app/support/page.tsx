"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PRESET_AMOUNTS = [
  { label: "$5", value: 500 },
  { label: "$10", value: 1000 },
  { label: "$25", value: 2500 },
  { label: "$50", value: 5000 },
];

const MIN_CUSTOM = 5;
const MAX_CUSTOM = 1000;

type RecurringPlan = "one_time" | "monthly_ongoing" | "monthly_limited" | "annual";

function SupportPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const recurringSuccess = searchParams.get("recurring") === "1";
  const canceled = searchParams.get("canceled") === "true";
  const welcome = searchParams.get("welcome") === "1";

  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(2500);
  const [customDollars, setCustomDollars] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringPlan, setRecurringPlan] = useState<Exclude<RecurringPlan, "one_time">>(
    "monthly_ongoing"
  );
  const [durationMonths, setDurationMonths] = useState(3);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const useCustom = customDollars !== "";
  const customNum = parseFloat(customDollars) || 0;
  const amountCents = useCustom ? Math.round(customNum * 100) : selectedAmount;
  const isValid =
    amountCents >= MIN_CUSTOM * 100 && amountCents <= MAX_CUSTOM * 100;

  function resolvePlan(): RecurringPlan {
    if (!recurringEnabled) return "one_time";
    return recurringPlan;
  }

  function submitLabel(): string {
    const amt = (amountCents / 100).toFixed(2);
    if (!recurringEnabled) return `Contribute $${amt}`;
    if (recurringPlan === "annual") return `Subscribe — $${amt}/year`;
    if (recurringPlan === "monthly_limited")
      return `Subscribe — $${amt}/mo × ${durationMonths} mo`;
    return `Subscribe — $${amt}/month`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const plan = resolvePlan();
      const body: Record<string, unknown> = {
        amountCents,
        plan,
      };
      if (plan === "monthly_limited") {
        body.durationMonths = durationMonths;
      }
      const res = await fetch("/api/support/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-xl px-4 py-10 sm:py-12">
          <h1
            className="masthead text-2xl font-semibold tracking-tight text-[color:var(--color-dark)] text-center sm:text-3xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            Support Spring-Ford Press
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-medium)] text-center">
            Your contribution helps us keep independent, neighborhood-first reporting in the Spring-Ford area.
          </p>

          {success && (
            <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <p className="font-semibold text-green-800">Thank you for your support.</p>
              <p className="mt-1 text-sm text-green-700">
                {recurringSuccess
                  ? "Your recurring contribution is set up. You’ll receive a confirmation email with receipt details."
                  : "Your payment was successful."}
              </p>
              {recurringSuccess && (
                <p className="mt-2 text-xs text-green-800">
                  Manage or cancel anytime from your profile → Support.
                </p>
              )}
            </div>
          )}

          {canceled && (
            <p className="mt-6 text-center text-sm text-[color:var(--color-medium)]">
              Payment was canceled. You can try again whenever you’re ready.
            </p>
          )}

          {authLoading && (
            <div className="mt-10 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
            </div>
          )}

          {!authLoading && !user && !success && (
            <div className="mt-10 rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-soft sm:p-8 text-center">
              <p className="text-[color:var(--color-dark)] font-semibold mb-2">
                Create an account or sign in to contribute
              </p>
              <p className="text-sm text-[color:var(--color-medium)] mb-6">
                Your thank-you email and receipt will be sent to your Spring-Ford Press account email.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/signup?returnTo=/support"
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-dark)] py-3 px-6 text-sm font-bold hover:bg-[#333] transition"
                  style={{ color: "#ffffff" }}
                >
                  Create account
                </Link>
                <Link
                  href="/login?returnTo=/support"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[color:var(--color-dark)] py-3 px-6 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-[color:var(--color-dark)] hover:text-white transition"
                >
                  Log in
                </Link>
              </div>
            </div>
          )}

          {!success && user && welcome && (
            <p className="mt-6 text-center text-sm text-[color:var(--color-riviera-blue)] font-medium">
              Thanks for creating your account. Choose an amount below to contribute.
            </p>
          )}

          {!authLoading && user && !success && (
            <form
              onSubmit={handleSubmit}
              className="mt-10 rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-soft sm:p-8 space-y-6"
            >
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-dark)] mb-3">Choose an amount</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_AMOUNTS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(value);
                        setCustomDollars("");
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        !useCustom && selectedAmount === value
                          ? "bg-[color:var(--color-riviera-blue)] text-white"
                          : "border border-[color:var(--color-border)] text-[color:var(--color-dark)] hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="custom" className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1.5">
                    Or enter a custom amount ($5 – $1,000)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--color-medium)]">$</span>
                    <input
                      id="custom"
                      type="number"
                      min={MIN_CUSTOM}
                      max={MAX_CUSTOM}
                      step={1}
                      placeholder="25"
                      value={customDollars}
                      onChange={(e) => setCustomDollars(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[color:var(--color-border)] pt-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurringEnabled}
                    onChange={(e) => setRecurringEnabled(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-[color:var(--color-riviera-blue)] focus:ring-[color:var(--color-riviera-blue)]"
                  />
                  <span>
                    <span className="font-semibold text-[color:var(--color-dark)]">Make this recurring</span>
                    <span className="block text-sm text-[color:var(--color-medium)] mt-0.5">
                      Support us monthly or annually. You can cancel anytime from your profile.
                    </span>
                  </span>
                </label>

                {recurringEnabled && (
                  <div className="mt-4 space-y-3 pl-6 border-l-2 border-[color:var(--color-riviera-blue)]/30">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurringPlan"
                        checked={recurringPlan === "monthly_ongoing"}
                        onChange={() => setRecurringPlan("monthly_ongoing")}
                        className="text-[color:var(--color-riviera-blue)]"
                      />
                      <span className="text-sm text-[color:var(--color-dark)]">
                        Monthly — renews each month until you cancel
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurringPlan"
                        checked={recurringPlan === "monthly_limited"}
                        onChange={() => setRecurringPlan("monthly_limited")}
                        className="text-[color:var(--color-riviera-blue)]"
                      />
                      <span className="text-sm text-[color:var(--color-dark)]">
                        Monthly for a set number of months
                      </span>
                    </label>
                    {recurringPlan === "monthly_limited" && (
                      <div className="ml-6 flex items-center gap-2">
                        <label htmlFor="durationMonths" className="text-sm text-[color:var(--color-medium)]">
                          Number of months (1–36):
                        </label>
                        <input
                          id="durationMonths"
                          type="number"
                          min={1}
                          max={36}
                          value={durationMonths}
                          onChange={(e) =>
                            setDurationMonths(
                              Math.min(36, Math.max(1, parseInt(e.target.value, 10) || 1))
                            )
                          }
                          className="w-20 rounded border border-[color:var(--color-border)] px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurringPlan"
                        checked={recurringPlan === "annual"}
                        onChange={() => setRecurringPlan("annual")}
                        className="text-[color:var(--color-riviera-blue)]"
                      />
                      <span className="text-sm text-[color:var(--color-dark)]">
                        Annual — billed once per year until you cancel
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <p className="text-xs text-[color:var(--color-medium)]">
                Secure payment by Stripe. Cards, Apple Pay, Google Pay, and other methods accepted.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full rounded-full bg-[color:var(--color-dark)] py-3 text-sm font-bold text-white hover:bg-[#333] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Redirecting to checkout…" : submitLabel()}
              </button>
            </form>
          )}

          <p className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="min-h-screen flex items-center justify-center bg-[color:var(--color-surface)]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
          </main>
          <Footer />
        </>
      }
    >
      <SupportPageContent />
    </Suspense>
  );
}
