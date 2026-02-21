"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
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
    }, forceShow ? 1000 : SHOW_DELAY_MS);

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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease-out",
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl ring-1 ring-[color:var(--color-border)] sm:p-8"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.96)",
          transition: "opacity 400ms ease-out, transform 400ms ease-out",
        }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <p className="eyebrow text-[color:var(--color-medium)]">Limited time</p>
          <h2 className="masthead mt-1 text-2xl font-black tracking-tight text-[color:var(--color-dark)] sm:text-3xl">
            Spring-Ford Press{" "}
            <span className="text-[color:var(--color-riviera-blue)]">Grand Opening Offer</span>
          </h2>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="text-base font-semibold text-[color:var(--color-medium)] line-through sm:text-lg">
              $5/month
            </span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800 sm:text-base">
              FREE
            </span>
          </div>

          <p className="mt-3 text-lg font-semibold text-[color:var(--color-dark)] sm:text-xl">
            Free for the first 3 months
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-medium)]">
            Super limited offer — only available to the first 500 users.
          </p>

          <div className="mt-6 flex justify-center">
            {hasAccount ? (
              <Link
                href="/subscribe"
                className="inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-bold shadow-lg transition hover:bg-[#333]"
                style={{ color: "#ffffff" }}
              >
                Subscribe now
              </Link>
            ) : (
              <Link
                href="/signup?returnTo=/subscribe"
                className="inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-bold shadow-lg transition hover:bg-[#333]"
                style={{ color: "#ffffff" }}
              >
                Create free account
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
