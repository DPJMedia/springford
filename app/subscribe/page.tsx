"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SubscribeBenefitsAnimation } from "@/components/SubscribeBenefitsAnimation";
import { ConfirmSubscriptionModal } from "@/components/ConfirmSubscriptionModal";
import { SubscribeSuccessModal } from "@/components/SubscribeSuccessModal";
import { NoAccountModal } from "@/components/NoAccountModal";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/tenant/TenantProvider";

const HERO_BENEFITS = [
  {
    title: "Breaking-news alerts",
    body: "Be the first to know the moment a story drops in your neighborhood — before it hits social, before it's everywhere else.",
  },
  {
    title: "Subscriber-only investigations",
    body: "Long-form reporting, interviews, and deep-dives reserved for members. The stories that take weeks to tell.",
  },
  {
    title: "The weekly briefing",
    body: "Council agendas, school-board meetings, and what to watch for the week ahead — curated by our editors every Sunday.",
  },
  {
    title: "Hyper-local coverage",
    body: "Reporting on the streets you live on, the schools your kids attend, and the people who run your town. Not the noise from everywhere else.",
  },
];

const PROMISES = [
  {
    title: "Always free",
    body: "We don't paywall journalism. No tiers, no upgrades, no asterisks.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Zero spam",
    body: "Only the stories that matter. No filler, no clickbait, no list-rentals, ever.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "One-click unsubscribe",
    body: "Leave anytime, no questions asked. The link is in every email we send.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

function SubscribePageContent() {
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const [user, setUser] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showNoAccountModal, setShowNoAccountModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const hasOpenedWelcomeModal = useRef(false);
  const supabase = createClient();
  const { id: tenantId, name: siteName } = useTenant();

  useEffect(() => {
    checkUserStatus();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => checkUserStatus());
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (welcome && user && !isSubscribed && !loading && !hasOpenedWelcomeModal.current) {
      hasOpenedWelcomeModal.current = true;
      setShowConfirmModal(true);
    }
  }, [welcome, user, isSubscribed, loading]);

  async function checkUserStatus() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("newsletter_subscribed")
        .eq("id", currentUser.id)
        .single();
      setIsSubscribed(profile?.newsletter_subscribed ?? false);
      setUser(currentUser);
    } else {
      setUser(null);
      setIsSubscribed(false);
    }
    setLoading(false);
  }

  function handleClaimClick(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setShowNoAccountModal(true);
      return;
    }
    setShowConfirmModal(true);
  }

  async function handleConfirmSubscribe() {
    if (!user) return;
    setConfirming(true);
    try {
      const subscribedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          newsletter_subscribed: true,
          newsletter_subscribed_at: subscribedAt,
        })
        .eq("id", user.id);
      if (updateError) throw updateError;

      const { error: tenantSubErr } = await supabase
        .from("tenant_newsletter_subscriptions")
        .upsert(
          {
            user_id: user.id,
            tenant_id: tenantId,
            subscribed: true,
            subscribed_at: subscribedAt,
            unsubscribed_at: null,
          },
          { onConflict: "user_id,tenant_id" },
        );
      if (tenantSubErr) throw tenantSubErr;
      setShowConfirmModal(false);
      try {
        await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
      } catch {
        // non-blocking
      }
      setIsSubscribed(true);
      setShowSuccessModal(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-[color:var(--color-surface)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
        </main>
        <Footer />
      </>
    );
  }

  // Reusable "claim" form (hero + final CTA both submit the same handler).
  function ClaimButton({ size = "lg" }: { size?: "lg" | "xl" }) {
    const sizeClasses =
      size === "xl"
        ? "px-12 py-5 text-base sm:text-lg"
        : "px-10 py-4 text-base";
    return (
      <form onSubmit={handleClaimClick} className="w-full sm:w-auto">
        <button
          type="submit"
          className={`group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[color:var(--color-riviera-blue)] font-bold uppercase tracking-wide text-white shadow-[0_12px_28px_-10px_rgba(43,138,168,0.55)] transition hover:brightness-110 hover:shadow-[0_18px_36px_-12px_rgba(43,138,168,0.7)] hover:-translate-y-0.5 active:translate-y-0 ${sizeClasses}`}
        >
          <span>Subscribe — it's free</span>
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    );
  }

  // Already-subscribed celebration view.
  if (isSubscribed && !welcome) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[color:var(--color-surface)]">
          <div className="mx-auto max-w-2xl px-4 py-20 sm:py-28 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)]/12 text-[color:var(--color-riviera-blue)]">
              <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.41 0l-3.5-3.5a1 1 0 011.41-1.42L8.5 12.09l6.79-6.8a1 1 0 011.41 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--color-riviera-blue)]">
              You're in
            </p>
            <h1 className="masthead mt-3 text-4xl sm:text-5xl font-semibold leading-[1.05] tracking-tight text-[color:var(--color-dark)]">
              Welcome to the {siteName} community.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[color:var(--color-medium)]">
              You'll start receiving breaking-news alerts, the weekly briefing, and exclusive subscriber stories straight to your inbox.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-[color:var(--color-dark)] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#333]"
              >
                Read today's stories
              </Link>
              <Link
                href="/profile"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border-2 border-[color:var(--color-border)] bg-white px-8 py-3.5 text-sm font-semibold text-[color:var(--color-dark)] transition hover:border-[color:var(--color-riviera-blue)]"
              >
                Manage subscription
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="bg-[color:var(--color-surface)]">
        {/* ============================== HERO ============================== */}
        <section className="relative overflow-hidden">
          {/* Layered backdrop: subtle gradient + faint serif "watermark" */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[color:var(--color-riviera-blue)]/[0.05] via-white to-white" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--color-riviera-blue)]/30 to-transparent" />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[18vw] font-bold leading-none tracking-tighter text-[color:var(--color-riviera-blue)]/[0.04] sm:text-[14vw] lg:text-[12rem]"
            style={{ fontFamily: "var(--font-masthead), Didot, serif" }}
          >
            {siteName}
          </div>

          <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-28">
            {/* Newspaper-style date/strap line */}
            <div className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-riviera-blue)]">
              <span className="h-px w-8 bg-[color:var(--color-riviera-blue)]/40" />
              <span>Free Subscription</span>
              <span className="h-px w-8 bg-[color:var(--color-riviera-blue)]/40" />
            </div>

            <h1 className="masthead mt-6 text-center text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.02em] text-[color:var(--color-dark)] sm:text-6xl lg:text-[4.5rem]">
              Local journalism,
              <br className="hidden sm:block" />{" "}
              <span className="italic text-[color:var(--color-riviera-blue)]">delivered.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-[color:var(--color-medium)] sm:text-[17px]">
              Join the {siteName} community for breaking-news alerts, subscriber-only investigations, and a weekly briefing on the stories shaping your neighborhood.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3">
              <ClaimButton size="xl" />
              <p className="text-[12px] text-[color:var(--color-medium)]">
                No payment. No card. Unsubscribe anytime.
              </p>
              {!user && (
                <p className="mt-1 text-sm text-[color:var(--color-medium)]">
                  Already a member?{" "}
                  <Link
                    href="/login?returnTo=/subscribe"
                    className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              )}
            </div>

            {/* Subtle scroll cue */}
            <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--color-medium)]/70">
              <span>Why join</span>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </section>

        {/* ============================ WHY SUBSCRIBE ============================ */}
        <section className="relative border-t border-[color:var(--color-border)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--color-riviera-blue)]">
                What you'll get
              </p>
              <h2 className="masthead mt-3 text-3xl font-semibold leading-tight tracking-tight text-[color:var(--color-dark)] sm:text-[2.5rem]">
                Reporting that earns its place in your inbox.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6">
              {HERO_BENEFITS.map((b, i) => (
                <article
                  key={b.title}
                  className="group relative overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-white p-7 transition hover:-translate-y-0.5 hover:border-[color:var(--color-riviera-blue)]/40 hover:shadow-[0_18px_36px_-18px_rgba(15,23,42,0.18)] sm:p-8"
                >
                  {/* Decorative serif numeral */}
                  <span
                    aria-hidden
                    className="masthead pointer-events-none absolute -right-2 -top-3 select-none text-[5.5rem] font-semibold leading-none tracking-tight text-[color:var(--color-riviera-blue)]/[0.10] transition group-hover:text-[color:var(--color-riviera-blue)]/[0.18] sm:text-[6.5rem]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="relative">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)]/10 text-[color:var(--color-riviera-blue)]">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.41 0l-3.5-3.5a1 1 0 011.41-1.42L8.5 12.09l6.79-6.8a1 1 0 011.41 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <h3 className="headline text-lg font-semibold leading-snug text-[color:var(--color-dark)] sm:text-xl">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-medium)] sm:text-[15px]">
                      {b.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =========================== INSIDE THE INBOX =========================== */}
        <section className="relative border-t border-[color:var(--color-border)] bg-gradient-to-b from-[color:var(--color-riviera-blue)]/[0.04] to-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Copy */}
              <div className="order-2 lg:order-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--color-riviera-blue)]">
                  A look inside
                </p>
                <h2 className="masthead mt-3 text-3xl font-semibold leading-[1.05] tracking-tight text-[color:var(--color-dark)] sm:text-[2.5rem]">
                  Built for readers who actually want to <span className="text-[color:var(--color-riviera-blue)]">read.</span>
                </h2>
                <p className="mt-5 text-base leading-relaxed text-[color:var(--color-medium)] sm:text-[17px]">
                  Every alert, every briefing, every exclusive — designed to fit the way you live. Beautiful on desktop, perfect on your phone, and easy to forward to a neighbor.
                </p>

                <ul className="mt-7 space-y-4">
                  {[
                    {
                      t: "Push-style alerts",
                      b: "Time-sensitive stories the moment they break.",
                    },
                    {
                      t: "Subscriber-only depth",
                      b: "Long-form reporting and interviews you won't find on the public site.",
                    },
                    {
                      t: "A weekly read worth keeping",
                      b: "Sunday's curated briefing — the week ahead, in fifteen minutes.",
                    },
                  ].map((row) => (
                    <li key={row.t} className="flex gap-4">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)]/15 text-[color:var(--color-riviera-blue)]"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.41 0l-3.5-3.5a1 1 0 011.41-1.42L8.5 12.09l6.79-6.8a1 1 0 011.41 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold text-[color:var(--color-dark)]">
                          {row.t}
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed text-[color:var(--color-medium)]">
                          {row.b}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Animation */}
              <div className="order-1 lg:order-2">
                <div className="relative">
                  {/* Decorative offset frame for visual depth */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-3 rounded-2xl border border-[color:var(--color-riviera-blue)]/20 bg-[color:var(--color-riviera-blue)]/[0.03] sm:-inset-5"
                  />
                  <div className="relative">
                    <SubscribeBenefitsAnimation />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ THE PROMISE ============================ */}
        <section className="border-t border-[color:var(--color-border)]">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--color-riviera-blue)]">
                The promise
              </p>
              <h2 className="masthead mt-3 text-2xl font-semibold leading-tight tracking-tight text-[color:var(--color-dark)] sm:text-[2rem]">
                Three things we'll never change.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3 sm:gap-8">
              {PROMISES.map((p) => (
                <div key={p.title} className="text-center">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--color-riviera-blue)]/30 bg-[color:var(--color-riviera-blue)]/[0.06] text-[color:var(--color-riviera-blue)]">
                    {p.icon}
                  </div>
                  <h3 className="headline mt-4 text-lg font-semibold text-[color:var(--color-dark)]">
                    {p.title}
                  </h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[color:var(--color-medium)]">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =============================== FINAL CTA =============================== */}
        <section className="relative overflow-hidden bg-[color:var(--color-dark)] text-white">
          {/* Decorative gradient and watermark */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(43,138,168,0.35),transparent_60%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-20 h-48 select-none whitespace-nowrap text-center text-[28vw] font-bold leading-none tracking-tighter text-white/[0.025] sm:text-[20vw] lg:text-[14rem]"
            style={{ fontFamily: "var(--font-masthead), Didot, serif" }}
          >
            {siteName}
          </div>

          <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24 lg:py-28 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-riviera-blue)]">
              Free · Always
            </p>
            <h2 className="masthead mt-4 text-3xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Independent local news{" "}
              <span className="italic text-[color:var(--color-riviera-blue)]">deserves a reader.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-[17px]">
              Be one of them. Free, forever — and you'll never get a single piece of mail you didn't ask for.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3">
              <ClaimButton size="xl" />
              <p className="text-[12px] text-white/55">
                No payment. No card. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <NoAccountModal
        isOpen={showNoAccountModal}
        onClose={() => setShowNoAccountModal(false)}
        returnTo="/subscribe"
      />

      <ConfirmSubscriptionModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubscribe}
        confirming={confirming}
        title={welcome && user ? `Thank you for signing up, ${user.user_metadata?.full_name || "there"}!` : undefined}
      />

      <SubscribeSuccessModal isOpen={showSuccessModal} />
    </>
  );
}

export default function SubscribePage() {
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
      <SubscribePageContent />
    </Suspense>
  );
}
