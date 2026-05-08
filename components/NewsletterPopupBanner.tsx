"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/tenant/TenantProvider";

const COOKIE_DISMISSED = "newsletter_popup_dismissed";
const COOKIE_MAX_AGE_24H = 86400; // 24 hours
const SHOW_DELAY_MS = 10000; // 10 seconds before the popup appears

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function setDismissCookie() {
  // Flat 24-hour cooldown for every unsubscribed / anonymous visitor.
  setCookie(COOKIE_DISMISSED, "1", COOKIE_MAX_AGE_24H);
}

const BENEFITS = [
  "Breaking local news alerts the moment stories publish",
  "Exclusive subscriber-only investigations and deep-dives",
  "Weekly briefing — council agendas, meetings, must-knows",
  "Hyper-local coverage you won't find anywhere else",
];

export function NewsletterPopupBanner() {
  const { name: siteName } = useTenant();
  const searchParams = useSearchParams();
  /** Bypass dismiss cookie for QA: add ?show_newsletter_popup=1 to the URL */
  const forceShow = searchParams.get("show_newsletter_popup") === "1";
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    if (!forceShow && getCookie(COOKIE_DISMISSED)) {
      setChecking(false);
      return;
    }

    const supabase = createClient();

    async function checkAndShow() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { show: true, hasAccount: false };
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("newsletter_subscribed")
        .eq("id", user.id)
        .single();
      if (profile?.newsletter_subscribed) {
        return { show: false, hasAccount: true };
      }
      return { show: true, hasAccount: true };
    }

    const delayMs = forceShow ? 1000 : SHOW_DELAY_MS;

    let mounted = true;
    const timer = setTimeout(async () => {
      if (!mounted) return;
      const { show: ok, hasAccount: account } = await checkAndShow();
      setChecking(false);
      setHasAccount(account);
      if (ok) {
        setShow(true);
        requestAnimationFrame(() => setVisible(true));
      }
    }, delayMs);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [forceShow]);

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => {
      setShow(false);
      setDismissCookie();
    }, 400);
  }

  if (!show || checking) return null;

  const ctaHref = hasAccount ? "/subscribe" : "/signup?returnTo=/subscribe";
  const ctaLabel = hasAccount ? "Subscribe — it's free" : "Sign up — it's free";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-[#0f172a]/45 backdrop-blur-[3px]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease-out",
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.45)] ring-1 ring-black/[0.06]"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.96) translateY(10px)",
          transition: "opacity 400ms ease-out, transform 400ms cubic-bezier(0.34, 1.2, 0.64, 1)",
        }}
      >
        {/* Top gradient accent + soft serif backdrop */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[color:var(--color-riviera-blue)] via-[#3d8ba8] to-[color:var(--color-riviera-blue)]" />

        <div className="relative px-6 pb-7 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-2 rounded-full text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] hover:bg-gray-100/90 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Eyebrow */}
          <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.22em] text-[color:var(--color-riviera-blue)]">
            Free · Always
          </p>

          {/* Masthead-style headline */}
          <h2 className="masthead mt-3 text-center text-[1.7rem] font-semibold leading-[1.1] tracking-tight text-[color:var(--color-dark)] sm:text-[2rem]">
            Don't miss a story
            <br />
            <span className="text-[color:var(--color-riviera-blue)]">in your neighborhood</span>
          </h2>

          <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-[color:var(--color-medium)]">
            Join the {siteName} community for free, independent local journalism — straight to your inbox.
          </p>

          {/* Benefits */}
          <ul className="mt-5 space-y-2.5">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)]/12 text-[color:var(--color-riviera-blue)]"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.41 0l-3.5-3.5a1 1 0 011.41-1.42L8.5 12.09l6.79-6.8a1 1 0 011.41 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="text-[13.5px] leading-snug text-[color:var(--color-dark)]">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <Link
              href={ctaHref}
              className="inline-flex w-full items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
            >
              {ctaLabel}
            </Link>
            <p className="text-[11px] text-[color:var(--color-medium)]">
              No payment. No card. Unsubscribe anytime.
            </p>
          </div>

          {!hasAccount && (
            <p className="mt-4 text-center text-[12.5px] text-[color:var(--color-medium)]">
              Already have an account?{" "}
              <Link href="/login?returnTo=/subscribe" className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline">
                Log in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
