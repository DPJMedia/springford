"use client";

import { useState, useEffect, useRef } from "react";

const SCENES = [
  { id: "article", label: "Premium articles", duration: 4500 },
  { id: "newsletter", label: "Weekly newsletter coming soon", duration: 4500 },
  { id: "notification", label: "New-article alerts", duration: 4500 },
];

const PHONE_OPEN_DELAY_MS = 2500;

export function SubscribeBenefitsAnimation() {
  const [scene, setScene] = useState(0);
  const [newsletterOpened, setNewsletterOpened] = useState(false);
  const [articleAlertOpened, setArticleAlertOpened] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance scenes
  useEffect(() => {
    const current = SCENES[scene];
    const t = setTimeout(
      () => setScene((s) => (s + 1) % SCENES.length),
      current.duration
    );
    return () => clearTimeout(t);
  }, [scene]);

  // When leaving a phone scene, reset "opened" state
  useEffect(() => {
    if (SCENES[scene].id !== "newsletter") setNewsletterOpened(false);
    if (SCENES[scene].id !== "notification") setArticleAlertOpened(false);
  }, [scene]);

  // After delay on phone scenes, show "opened" email view
  useEffect(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (SCENES[scene].id === "newsletter") {
      setNewsletterOpened(false);
      openTimeoutRef.current = setTimeout(
        () => setNewsletterOpened(true),
        PHONE_OPEN_DELAY_MS
      );
    } else if (SCENES[scene].id === "notification") {
      setArticleAlertOpened(false);
      openTimeoutRef.current = setTimeout(
        () => setArticleAlertOpened(true),
        PHONE_OPEN_DELAY_MS
      );
    }
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    };
  }, [scene]);

  const isNewsletter = SCENES[scene].id === "newsletter";
  const isNotification = SCENES[scene].id === "notification";

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Animation box - extra bottom padding so phone + dots + label have space */}
      <div
        className="relative rounded-xl overflow-hidden shadow-lg pb-4"
        style={{
          backgroundColor: "var(--color-off-white)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-soft)",
          minHeight: 400,
        }}
      >
        <div className="relative w-full min-h-[300px] flex items-center justify-center py-8 px-4">
          {/* Scene 1: Premium article card */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-500"
            style={{
              opacity: SCENES[scene].id === "article" ? 1 : 0,
              pointerEvents: SCENES[scene].id === "article" ? "auto" : "none",
            }}
          >
            <div className="relative w-full max-w-[280px] rounded-lg overflow-hidden shadow-soft ring-1 ring-[color:var(--color-border)] bg-white">
              <div className="relative h-16 overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-br"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(43, 138, 168, 0.15) 0%, rgba(141, 111, 162, 0.15) 100%)",
                  }}
                />
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[color:var(--color-medium)]">
                  <span className="font-semibold">Politics</span>
                  <span className="h-1 w-1 rounded-full bg-[color:var(--color-medium)]" />
                  <span>Spring City</span>
                </div>
                <h3 className="headline text-sm font-semibold text-[color:var(--color-dark)] leading-tight">
                  Council votes on new development
                </h3>
                <p className="text-[11px] text-[color:var(--color-medium)] line-clamp-2">
                  The Spring-Ford school board approved the latest proposal…
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[color:var(--color-riviera-blue)]/10 text-[color:var(--color-riviera-blue)]">
                    Premium
                  </span>
                  <span className="text-[10px] font-semibold text-[color:var(--color-riviera-blue)]">
                    Read story →
                  </span>
                </div>
              </div>
              <div className="absolute top-[45%] left-[40%] w-5 h-5 flex items-center justify-center animate-subscribe-cursor pointer-events-none z-10">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-[color:var(--color-dark)] drop-shadow-sm"
                >
                  <path
                    fill="currentColor"
                    d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
                  />
                </svg>
                <span className="absolute w-4 h-4 rounded-full border-2 border-[color:var(--color-dark)]/40 animate-subscribe-click-ring" />
              </div>
            </div>
          </div>

          {/* Scene 2: Phone - newsletter notification then opened email */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-500"
            style={{
              opacity: isNewsletter ? 1 : 0,
              pointerEvents: isNewsletter ? "auto" : "none",
            }}
          >
            <div
              className="relative w-[120px] rounded-[18px] overflow-hidden shadow-xl border-4 border-[color:var(--color-dark)] flex-shrink-0 mx-auto"
              style={{ aspectRatio: "9/19" }}
            >
              <div className="absolute inset-0 bg-[#1a1a1a]">
                <div className="h-6 px-4 flex items-center justify-between text-[8px] text-white/80">
                  <span>9:41</span>
                  <span className="flex gap-0.5">📶 🔋</span>
                </div>
                {!newsletterOpened ? (
                  <div className="mt-4 mx-2 animate-subscribe-notification-slide">
                    <div className="rounded-xl bg-white/95 backdrop-blur-sm overflow-hidden shadow-lg">
                      <div className="px-3 py-2 flex items-center gap-2 border-b border-[color:var(--color-border)]">
                        <img
                          src="/favicon.ico"
                          alt=""
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-[color:var(--color-dark)] truncate">
                            Spring-Ford Press
                          </p>
                          <p className="text-[9px] text-[color:var(--color-medium)]">
                            Your weekly briefing is here
                          </p>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-[9px] text-[color:var(--color-medium)] line-clamp-2">
                          The latest neighborhood stories and council updates…
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 mx-1.5 overflow-y-auto rounded-lg bg-white transition-opacity duration-300">
                    <div className="p-2 border-b border-[color:var(--color-border)]">
                      <p className="text-[9px] text-[color:var(--color-medium)] uppercase tracking-wider">
                        From Spring-Ford Press
                      </p>
                      <p className="text-[10px] font-semibold text-[color:var(--color-dark)]">
                        Your weekly briefing is here
                      </p>
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-[9px] font-semibold text-[color:var(--color-dark)]">
                        Welcome to the Spring-Ford Press Newsletter
                      </p>
                      <p className="text-[8px] text-[color:var(--color-medium)] leading-snug">
                        You're all set. We'll keep you updated with the latest neighborhood stories, local news, and council updates.
                      </p>
                      <p className="text-[8px] text-[color:var(--color-medium)] leading-snug">
                        Look for our weekly briefing in your inbox.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scene 3: Phone - new article notification then opened email */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-500"
            style={{
              opacity: isNotification ? 1 : 0,
              pointerEvents: isNotification ? "auto" : "none",
            }}
          >
            <div
              className="relative w-[120px] rounded-[18px] overflow-hidden shadow-xl border-4 border-[color:var(--color-dark)] flex-shrink-0 mx-auto"
              style={{ aspectRatio: "9/19" }}
            >
              <div className="absolute inset-0 bg-[#1a1a1a]">
                <div className="h-6 px-4 flex items-center justify-between text-[8px] text-white/80">
                  <span>9:41</span>
                  <span className="flex gap-0.5">📶 🔋</span>
                </div>
                {!articleAlertOpened ? (
                  <div className="mt-4 mx-2 animate-subscribe-notification-slide">
                    <div className="rounded-xl bg-white/95 backdrop-blur-sm overflow-hidden shadow-lg">
                      <div className="px-3 py-2 flex items-center gap-2">
                        <img
                          src="/favicon.ico"
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-[color:var(--color-dark)]">
                            New article
                          </p>
                          <p className="text-[9px] text-[color:var(--color-medium)] truncate">
                            Council votes on new development…
                          </p>
                          <p className="text-[8px] text-[color:var(--color-medium)]/70 mt-0.5">
                            Just now
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 mx-1.5 overflow-y-auto rounded-lg bg-white transition-opacity duration-300">
                    <div className="p-2 border-b border-[color:var(--color-border)]">
                      <p className="text-[9px] text-[color:var(--color-medium)] uppercase tracking-wider">
                        From Spring-Ford Press
                      </p>
                      <p className="text-[10px] font-semibold text-[color:var(--color-dark)]">
                        New article published
                      </p>
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-[9px] font-semibold text-[color:var(--color-dark)]">
                        Council votes on new development
                      </p>
                      <p className="text-[8px] text-[color:var(--color-medium)] leading-snug">
                        A new article has been published. Tap to read the full story on Spring-Ford Press.
                      </p>
                      <p className="text-[8px] font-semibold text-[color:var(--color-riviera-blue)] pt-1">
                        Read article →
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Three dots - which animation is playing; clickable to jump */}
        <div className="flex justify-center gap-2 mt-4 mb-1">
          {SCENES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to ${SCENES[i].label}`}
              onClick={() => setScene(i)}
              className={`rounded-full transition-all ${
                scene === i
                  ? "w-6 h-2.5 bg-[color:var(--color-dark)]"
                  : "w-2.5 h-2.5 bg-[color:var(--color-medium)]/40 hover:bg-[color:var(--color-medium)]/60"
              }`}
            />
          ))}
        </div>

        {/* Scene label - more space below dots */}
        <p className="text-center text-xs font-medium text-[color:var(--color-medium)] mt-2 pb-1">
          {SCENES[scene].label}
        </p>
      </div>
    </div>
  );
}
