"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/tenant/TenantProvider";

const COOKIE_DISMISSED = "newsletter_popup_dismissed";
const COOKIE_VIEWS = "newsletter_popup_views";
const COOKIE_MAX_AGE_24H = 86400; // 24 hours
const COOKIE_MAX_AGE_2WEEKS = 1209600; // 14 days
const MAX_VIEWS_BEFORE_COOLDOWN = 3;
const SHOW_DELAY_MS = 10000; // 10 seconds

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
  if (typeof document === "undefined") return;
  const viewsRaw = getCookie(COOKIE_VIEWS) || "0";
  const views = Math.min(parseInt(viewsRaw, 10) + 1, MAX_VIEWS_BEFORE_COOLDOWN);
  setCookie(COOKIE_VIEWS, String(views), 365 * 24 * 60 * 60); // persist 1 year
  const cooldown = views >= MAX_VIEWS_BEFORE_COOLDOWN ? COOKIE_MAX_AGE_2WEEKS : COOKIE_MAX_AGE_24H;
  setCookie(COOKIE_DISMISSED, "1", cooldown);
}

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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-[#0f172a]/30 backdrop-blur-[2px]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease-out",
      }}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.06]"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.97) translateY(8px)",
          transition: "opacity 400ms ease-out, transform 400ms cubic-bezier(0.34, 1.2, 0.64, 1)",
        }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[color:var(--color-riviera-blue)] via-[#3d8ba8] to-[color:var(--color-riviera-blue)]" />
        <div className="relative px-6 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-8">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] hover:bg-gray-100/90 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-riviera-blue)]">
              Limited time
            </p>
            <h2 className="masthead mt-3 text-[1.65rem] font-semibold leading-tight tracking-tight text-[color:var(--color-dark)] sm:text-3xl">
              {siteName}
              <br />
              <span className="text-[color:var(--color-riviera-blue)]">Grand Opening Offer</span>
            </h2>

            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-emerald-100/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-900 shadow-sm sm:text-sm">
                First 500 subscribers — free for a year
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center gap-0.5 text-center">
              <p className="text-xl font-bold text-[color:var(--color-dark)] sm:text-2xl">
                One full year free
              </p>
              <p className="text-[10px] font-normal leading-snug tracking-wide text-[color:var(--color-medium)] sm:text-[11px]">
                No payment method required
              </p>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-medium)] max-w-sm mx-auto">
              Our way of giving back to the community and keeping our earliest subscribers well informed.
            </p>

            <div className="mt-8 flex justify-center">
              {hasAccount ? (
                <Link
                  href="/subscribe"
                  className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
                >
                  Subscribe now
                </Link>
              ) : (
                <Link
                  href="/signup?returnTo=/subscribe"
                  className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
                >
                  Create free account
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
