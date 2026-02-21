"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

function SupportPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const [selectedAmount, setSelectedAmount] = useState<number>(2500); // $25 default
  const [customDollars, setCustomDollars] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCustom = customDollars !== "";
  const customNum = parseFloat(customDollars) || 0;
  const amountCents = useCustom ? Math.round(customNum * 100) : selectedAmount;
  const isValid =
    amountCents >= MIN_CUSTOM * 100 &&
    amountCents <= MAX_CUSTOM * 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
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
          <h1 className="masthead text-2xl font-black tracking-tight text-[color:var(--color-dark)] text-center sm:text-3xl">
            Support Spring-Ford Press
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-medium)] text-center">
            Your contribution helps us keep independent, neighborhood-first reporting in the Spring-Ford area.
          </p>

          {success && (
            <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <p className="font-semibold text-green-800">Thank you for your support.</p>
              <p className="mt-1 text-sm text-green-700">Your payment was successful.</p>
            </div>
          )}

          {canceled && (
            <p className="mt-6 text-center text-sm text-[color:var(--color-medium)]">
              Payment was canceled. You can try again whenever you’re ready.
            </p>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="mt-10 rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-soft sm:p-8">
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
              <div className="mb-6">
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
              <p className="text-xs text-[color:var(--color-medium)] mb-6">
                Secure payment by Stripe. Cards, Apple Pay, Google Pay, and other methods accepted.
              </p>
              {error && (
                <p className="text-sm text-red-600 mb-4">{error}</p>
              )}
              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full rounded-full bg-[color:var(--color-dark)] py-3 text-sm font-bold text-white hover:bg-[#333] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Redirecting to checkout…" : `Contribute $${(amountCents / 100).toFixed(2)}`}
              </button>
            </form>
          )}

          <p className="mt-8 text-center">
            <Link href="/" className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition">
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
    <Suspense fallback={
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-[color:var(--color-surface)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
        </main>
        <Footer />
      </>
    }>
      <SupportPageContent />
    </Suspense>
  );
}
