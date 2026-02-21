"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EXPECT_ITEMS = [
  "First to know when new articles publish",
  "Access to premium, subscriber-only articles",
  "Weekly newsletter coming soon",
  "Email notifications for new articles",
  "Exclusive neighborhood coverage",
];

type Props = {
  isOpen: boolean;
};

export function SubscribeSuccessModal({ isOpen }: Props) {
  const router = useRouter();
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!isOpen || confettiFired.current) return;
    confettiFired.current = true;

    const fireConfetti = async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        const duration = 2500;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#2b8aa8", "#1a1a1a", "#57959f"],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#2b8aa8", "#1a1a1a", "#57959f"],
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      } catch {
        // canvas-confetti not available, skip
      }
    };

    fireConfetti();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-[color:var(--color-dark)] mb-3">
            Thank you for subscribing!
          </h2>

          <p className="text-sm text-[color:var(--color-medium)] mb-4">
            Check your inbox for a welcome email. Here's what you can expect:
          </p>

          <ul className="text-left space-y-2 mb-6">
            {EXPECT_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-[color:var(--color-dark)]"
              >
                <span className="text-[color:var(--color-riviera-blue)]">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-full bg-[color:var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#333]"
            >
              Proceed to site
            </button>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="w-full rounded-full border-2 border-[color:var(--color-dark)] px-4 py-3 text-sm font-semibold text-[color:var(--color-dark)] transition hover:bg-[color:var(--color-dark)] hover:text-white"
            >
              View subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
