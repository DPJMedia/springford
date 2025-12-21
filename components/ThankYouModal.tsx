"use client"

type ThankYouModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ThankYouModal({ isOpen, onClose }: ThankYouModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold text-[color:var(--color-dark)] mb-3">
            Thank You!
          </h2>
          
          <p className="text-sm text-[color:var(--color-medium)]">
            Thank you for subscribing to our newsletter.
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}

