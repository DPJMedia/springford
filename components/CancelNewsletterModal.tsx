"use client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelling?: boolean;
};

export function CancelNewsletterModal({
  isOpen,
  onClose,
  onConfirm,
  cancelling = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
          Cancel newsletter
        </h2>
        <p className="text-sm text-[color:var(--color-medium)] mb-4">
          Are you sure you want to unsubscribe from the Spring-Ford Press newsletter? You will receive a confirmation email and can resubscribe anytime from your profile or at springford.press/subscribe.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 rounded-full border-2 border-[color:var(--color-dark)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-dark)] transition hover:bg-[color:var(--color-dark)] hover:text-white disabled:opacity-50"
          >
            Keep subscription
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cancelling ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
