"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

const STORAGE_KEY = "springford_advertise_submitted";

function AdvertisePageContent() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("submitted") === "1") {
      setSubmitted(true);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "true");
      return;
    }
    const stored = typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setSubmitted(true);
  }, [mounted, searchParams]);

  const handleSubmitSuccess = () => {
    setSubmitted(true);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleFillAnother = () => {
    setSubmitted(false);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-white shadow-soft ring-1 ring-[color:var(--color-border)] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Left: Content */}
              <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[color:var(--color-off-white)]">
                <div>
                  <Link href="/" className="flex items-center gap-2 mb-8">
                    <img
                      src="/favicon.ico"
                      alt="Spring-Ford Press"
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <span className="masthead font-semibold text-[color:var(--color-dark)] text-lg" style={{ letterSpacing: "-0.02em" }}>
                      Spring-Ford Press
                    </span>
                  </Link>
                  <h1 className="headline text-2xl font-bold text-[color:var(--color-dark)] leading-tight">
                    Unlock success with print and digital marketing solutions
                  </h1>
                  <div className="mt-4 h-1 w-16 bg-[color:var(--color-riviera-blue)] rounded" />
                  <p className="mt-6 text-sm text-[color:var(--color-medium)] leading-relaxed">
                    Reach your local audience through Spring-Ford Press. We serve Spring City, Royersford,
                    Limerick, Upper Providence, and the greater Spring-Ford area with trusted, neighborhood-focused journalism.
                  </p>
                  <p className="mt-4 text-sm text-[color:var(--color-medium)] leading-relaxed">
                    Whether you&apos;re a local business, community organization, or regional brand, our advertising
                    options deliver visibility where it matters most.
                  </p>
                  <p className="mt-4 text-sm text-[color:var(--color-medium)] leading-relaxed">
                    We in-house all of our advertising technology and statistics, which are modeled after industry
                    leaders like Meta, so we can provide the best possible performance for your advertisements.
                  </p>
                  <p className="mt-6 text-sm text-[color:var(--color-dark)] font-semibold">
                    Complete the form or email{" "}
                    <a href="mailto:news@dpjmedia.com" className="text-[color:var(--color-riviera-blue)] hover:underline">
                      news@dpjmedia.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Right: Form */}
              <div className="lg:col-span-3 p-6 sm:p-8 lg:p-10">
                {submitted ? (
                  <div className="py-8 sm:py-12 text-center px-4">
                    <div className="text-5xl mb-4">✓</div>
                    <h2 className="text-xl font-bold text-[color:var(--color-dark)] mb-2">
                      We got your message
                    </h2>
                    <p className="text-[color:var(--color-medium)] mb-6">
                      We&apos;ll get back to you soon.
                    </p>
                    <button
                      type="button"
                      onClick={handleFillAnother}
                      className="rounded-lg border-2 border-[color:var(--color-riviera-blue)] bg-white px-6 py-2.5 text-sm font-semibold text-[color:var(--color-riviera-blue)] hover:bg-[color:var(--color-riviera-blue)] hover:text-white transition"
                    >
                      Fill out another form
                    </button>
                  </div>
                ) : (
                  <form
                    action="https://formspree.io/f/mqedqljw"
                    method="POST"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSubmitting(true);
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      try {
                        const res = await fetch("https://formspree.io/f/mqedqljw", {
                          method: "POST",
                          body: formData,
                          headers: { Accept: "application/json" },
                        });
                        if (res.ok) handleSubmitSuccess();
                        else throw new Error();
                      } catch {
                        form.submit();
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          required
                          className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                          placeholder="First Name"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          required
                          className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                          placeholder="Email Address"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                          placeholder="Phone Number"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="company" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                          Company Name
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                          placeholder="Company Name"
                        />
                      </div>
                      <div>
                        <label htmlFor="website" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                          Website
                        </label>
                        <input
                          type="url"
                          id="website"
                          name="website"
                          className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                          placeholder="https://"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="postalCode" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                        placeholder="Postal Code"
                      />
                    </div>
                    <div>
                      <label htmlFor="interest" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                        What are you interested in learning?
                      </label>
                      <input
                        type="text"
                        id="interest"
                        name="interest"
                        className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                        placeholder="Tell us about your advertising goals"
                      />
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-xs font-semibold text-[color:var(--color-dark)] mb-1">
                        (Optional) Additional Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
                        placeholder="Any additional details..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-lg bg-[color:var(--color-riviera-blue)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdvertisePage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent" />
          </main>
          <Footer />
        </>
      }
    >
      <AdvertisePageContent />
    </Suspense>
  );
}
