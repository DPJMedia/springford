"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/tenant/TenantProvider";

const COOKIE_DISMISSED = "newsletter_popup_dismissed";
const COOKIE_MAX_AGE_24H = 86400; // 24 hours
const SHOW_DELAY_MS_FULL = 10000; // 10 seconds before the full popup appears
const SHOW_DELAY_MS_COMPACT = 4000; // 4 seconds for the compact mobile-article popup
const MOBILE_BREAKPOINT_PX = 640; // Tailwind's `sm` breakpoint — compact variant is mobile-only

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

type Variant = "full" | "compact";

export function NewsletterPopupBanner({
  variant = "full",
}: {
  /**
   * `full`     — original centered modal (homepage / desktop)
   * `compact`  — condensed bottom-sheet, mobile-only (article pages on phones)
   */
  variant?: Variant;
} = {}) {
  const { name: siteName } = useTenant();
  const searchParams = useSearchParams();
  /** Bypass dismiss cookie for QA: add ?show_newsletter_popup=1 to the URL */
  const forceShow = searchParams.get("show_newsletter_popup") === "1";
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track mobile viewport — the compact variant only renders on phones.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Compact variant only ever shows on mobile viewports.
    if (variant === "compact" && !isMobile) {
      setChecking(false);
      return;
    }

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

    const baseDelay =
      variant === "compact" ? SHOW_DELAY_MS_COMPACT : SHOW_DELAY_MS_FULL;
    const delayMs = forceShow ? 1000 : baseDelay;

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
  }, [forceShow, variant, isMobile]);

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

  // ── Compact mobile-article variant: bottom sheet, single value prop ──
  if (variant === "compact") {
    return <CompactBottomSheet
      siteName={siteName}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
      hasAccount={hasAccount}
      visible={visible}
      onDismiss={handleDismiss}
    />;
  }

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

/**
 * Mobile-only bottom sheet shown inside articles. Supports swipe-down to dismiss
 * with live drag tracking and a spring-back if the user doesn't pull far enough.
 */
function CompactBottomSheet({
  siteName,
  ctaHref,
  ctaLabel,
  hasAccount,
  visible,
  onDismiss,
}: {
  siteName: string;
  ctaHref: string;
  ctaLabel: string;
  hasAccount: boolean;
  visible: boolean;
  onDismiss: () => void;
}) {
  // Drag-to-dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartYRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const lastMoveYRef = useRef<number>(0);
  const lastMoveTimeRef = useRef<number>(0);
  const sheetHeightRef = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Threshold: drag > 35% of sheet height OR velocity > 0.6 px/ms → dismiss
  const DISMISS_DISTANCE_RATIO = 0.35;
  const DISMISS_VELOCITY = 0.6;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragStartYRef.current = t.clientY;
    dragStartTimeRef.current = performance.now();
    lastMoveYRef.current = t.clientY;
    lastMoveTimeRef.current = dragStartTimeRef.current;
    sheetHeightRef.current = sheetRef.current?.offsetHeight ?? 0;
    setIsDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStartYRef.current == null) return;
    const t = e.touches[0];
    const rawDelta = t.clientY - dragStartYRef.current;
    // Only follow downward drags; clamp upward to 0 so the sheet doesn't fly above its rest.
    const delta = Math.max(0, rawDelta);
    setDragY(delta);
    lastMoveYRef.current = t.clientY;
    lastMoveTimeRef.current = performance.now();
  }

  function onTouchEnd() {
    if (dragStartYRef.current == null) return;
    const totalDelta = lastMoveYRef.current - dragStartYRef.current;
    const totalTime = Math.max(1, lastMoveTimeRef.current - dragStartTimeRef.current);
    const velocity = totalDelta / totalTime; // px/ms, positive = downward
    const distanceThreshold =
      sheetHeightRef.current * DISMISS_DISTANCE_RATIO;

    dragStartYRef.current = null;
    setIsDragging(false);

    const shouldDismiss =
      totalDelta > distanceThreshold || velocity > DISMISS_VELOCITY;

    if (shouldDismiss) {
      // Animate the sheet the rest of the way down before firing dismiss.
      setDragY(sheetHeightRef.current || 600);
      setTimeout(() => onDismiss(), 200);
    } else {
      setDragY(0); // spring back
    }
  }

  // Combined transform: entry animation + active drag offset.
  const entryY = visible ? 0 : (sheetHeightRef.current || 600);
  const translateY = entryY + dragY;
  // Slight fade as the user drags further down.
  const dragOpacity = sheetHeightRef.current
    ? Math.max(0.2, 1 - dragY / sheetHeightRef.current)
    : 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[#0f172a]/40 backdrop-blur-[2px]"
      style={{
        opacity: visible ? dragOpacity : 0,
        transition: isDragging ? "none" : "opacity 350ms ease-out",
      }}
      onClick={onDismiss}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Subscribe to our newsletter"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="relative w-full overflow-hidden rounded-t-2xl bg-white shadow-[0_-20px_40px_-10px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.06] touch-pan-y"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging
            ? "none"
            : "transform 400ms cubic-bezier(0.32, 0.72, 0.4, 1)",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Top accent bar — matches the full popup */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[color:var(--color-riviera-blue)] via-[#3d8ba8] to-[color:var(--color-riviera-blue)]" />

        {/* iOS-style grabber — visual affordance for swipe-down */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="relative px-5 pt-2 pb-1">
          <button
            onClick={onDismiss}
            className="absolute top-1 right-2 p-2 rounded-full text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] hover:bg-gray-100/90 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--color-riviera-blue)]">
            Free Newsletter
          </p>

          <h2 className="masthead mt-1.5 text-[1.4rem] font-semibold leading-[1.15] tracking-tight text-[color:var(--color-dark)]">
            Don't miss a story
            <br />
            <span className="text-[color:var(--color-riviera-blue)]">in your neighborhood</span>
          </h2>

          <p className="mt-2 text-[13px] leading-snug text-[color:var(--color-medium)]">
            Breaking news, exclusive investigations, and the weekly local briefing — straight to your inbox.
          </p>

          <Link
            href={ctaHref}
            onClick={() => {
              // Treat the tap as a dismiss so we don't re-pop on the destination page.
              setDismissCookie();
            }}
            className="mt-4 mb-1 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition active:brightness-110"
          >
            {ctaLabel}
          </Link>

          {!hasAccount && (
            <p className="mt-2 mb-1 text-center text-[12px] text-[color:var(--color-medium)]">
              Already have an account?{" "}
              <Link
                href="/login?returnTo=/subscribe"
                className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
              >
                Log in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
