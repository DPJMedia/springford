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

const SUBSCRIBER_TERMS = [
  "First to know when new articles publish",
  "Access to premium, subscriber-only articles",
  "Weekly newsletter coming soon...",
  "Email notifications for new articles",
  "Exclusive neighborhood coverage and local news",
  "No spam — only what matters to your community",
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
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          newsletter_subscribed: true,
          newsletter_subscribed_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (updateError) throw updateError;
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 lg:items-center">
            {/* Left: offer card — matches newsletter popup visual language */}
            <div className="relative text-center lg:text-left">
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.06]">
                <div className="h-1.5 w-full bg-gradient-to-r from-[color:var(--color-riviera-blue)] via-[#3d8ba8] to-[color:var(--color-riviera-blue)]" />
                <div className="px-6 py-8 sm:px-10 sm:py-10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-riviera-blue)]">
                    Limited time
                  </p>
                  <h1 className="masthead mt-3 text-3xl font-semibold leading-tight tracking-tight text-[color:var(--color-dark)] sm:text-4xl lg:text-[2.5rem]">
                    Spring-Ford Press
                    <br />
                    <span className="text-[color:var(--color-riviera-blue)]">Grand Opening Offer</span>
                  </h1>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-emerald-100/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-900 shadow-sm sm:text-sm">
                      First 500 subscribers — free for a year
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col items-center gap-0.5 text-center">
                    <p className="text-2xl font-bold text-[color:var(--color-dark)] sm:text-3xl">
                      One full year free
                    </p>
                    <p className="text-[10px] font-normal leading-snug tracking-wide text-[color:var(--color-medium)] sm:text-[11px]">
                      No payment method required
                    </p>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-medium)] max-w-xl mx-auto lg:mx-0">
                    Our way of giving back to the Spring-Ford community and keeping our earliest subscribers well informed.
                  </p>

                  <div className="mt-8">
                    {!user ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                        <form onSubmit={handleClaimClick} className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start w-full sm:w-auto">
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-8 py-4 text-base font-bold text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
                          >
                            Claim my free year
                          </button>
                          <Link
                            href="/login"
                            className="inline-flex items-center justify-center text-center rounded-full border-2 border-[color:var(--color-border)] bg-white px-8 py-4 text-base font-semibold text-[color:var(--color-dark)] transition hover:border-[color:var(--color-riviera-blue)] hover:bg-gray-50/80"
                          >
                            Already have an account? Log in
                          </Link>
                        </form>
                      </div>
                    ) : isSubscribed ? (
                      <p className="text-[color:var(--color-medium)] font-medium">
                        You’re subscribed. Thanks for being part of Spring-Ford Press.
                      </p>
                    ) : (
                      <form onSubmit={handleClaimClick}>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-10 py-4 text-base font-bold text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
                        >
                          Claim my free year
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Animation */}
            <div className="flex flex-col items-center">
              <SubscribeBenefitsAnimation />
            </div>
          </div>

          {/* Subscriber terms */}
          <section className="mt-14 rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-soft sm:p-8">
            <h2 className="headline text-lg font-semibold text-[color:var(--color-dark)]">
              As a subscriber you receive
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {SUBSCRIBER_TERMS.map((term) => (
                <li
                  key={term}
                  className="flex items-center gap-2 text-sm text-[color:var(--color-medium)]"
                >
                  <span className="text-[color:var(--color-riviera-blue)]">✓</span>
                  {term}
                </li>
              ))}
            </ul>
          </section>
        </div>
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
