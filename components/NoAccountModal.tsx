"use client";

import Link from "next/link";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  returnTo?: string;
};

export function NoAccountModal({ isOpen, onClose, returnTo = "/subscribe" }: Props) {
  if (!isOpen) return null;

  const signupUrl = `/signup?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-[color:var(--color-dark)] mb-3">
          Looks like you don&apos;t have an account
        </h2>
        <p className="text-sm text-[color:var(--color-medium)] mb-6">
          Follow the simple process to create one. Once you&apos;re signed up, you&apos;ll be brought right back here to claim your free 3 months.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-2 border-[color:var(--color-dark)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-dark)] transition hover:bg-[color:var(--color-dark)] hover:text-white"
          >
            Cancel
          </button>
          <Link
            href={signupUrl}
            className="flex-1 rounded-full bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-center transition hover:bg-[#333]"
            style={{ color: "#ffffff" }}
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
