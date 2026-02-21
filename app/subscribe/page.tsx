"use client";

import { useState, useEffect, useRef } from "react";
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

export default function SubscribePage() {
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
            {/* Left: One loud offer */}
            <div className="text-center lg:text-left">
              <p className="eyebrow text-[color:var(--color-medium)]">
                Limited time
              </p>
              <h1 className="masthead mt-2 text-3xl font-black tracking-tight text-[color:var(--color-dark)] sm:text-4xl lg:text-5xl">
                Spring-Ford Press
                <br />
                <span className="text-[color:var(--color-riviera-blue)]">
                  Grand Opening Offer
                </span>
              </h1>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <span className="text-lg font-semibold text-[color:var(--color-medium)] line-through sm:text-xl">
                  $5/month
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-base font-bold text-green-800 sm:text-lg">
                  FREE
                </span>
              </div>

              <p className="mt-4 text-xl font-semibold text-[color:var(--color-dark)] sm:text-2xl">
                Free for the first 3 months
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-medium)]">
                Super limited offer — only available to the first 500 users to
                sign up.
              </p>

              <div className="mt-8">
                {!user ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                    <form onSubmit={handleClaimClick} className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-8 py-4 text-base font-bold shadow-lg transition hover:bg-[#333]"
                        style={{ color: "#ffffff" }}
                      >
                        Claim my free 3 months
                      </button>
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center text-center rounded-full border-2 border-[color:var(--color-dark)] px-8 py-4 text-base font-semibold text-[color:var(--color-dark)] transition hover:bg-[color:var(--color-dark)] hover:!text-white"
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
                      className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-dark)] px-10 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#333]"
                    >
                      Claim my free 3 months
                    </button>
                  </form>
                )}
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
