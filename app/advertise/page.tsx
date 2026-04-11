"use client";

import { Suspense, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/TenantProvider";

function AdvertisePageContent() {
  const { name: siteName, from_email } = useTenant();
  const contactMail = from_email?.trim() || "news@dpjmedia.com";
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
                    <span className="masthead font-semibold text-[color:var(--color-dark)] text-lg" style={{ letterSpacing: "-0.02em" }}>
                      {siteName}
                    </span>
                  </Link>
                  <h1 className="headline text-2xl font-bold text-[color:var(--color-dark)] leading-tight">
                    Advertise with {siteName}
                  </h1>
                  <div className="mt-4 h-1 w-16 bg-[color:var(--color-riviera-blue)] rounded" />
                  <p className="mt-6 text-sm text-[color:var(--color-medium)] leading-relaxed">
                    Reach your local audience through {siteName}. We publish trusted, neighborhood-focused journalism
                    for your community.
                  </p>
                  <p className="mt-4 text-sm text-[color:var(--color-medium)] leading-relaxed">
                    Whether you&apos;re a local business, community organization, or regional brand, our advertising
                    options deliver visibility where it matters most.
                  </p>
                  <p className="mt-4 text-sm text-[color:var(--color-medium)] leading-relaxed">
                    We track detailed analytics on every ad — impressions, clicks, and engagement — and provide
                    transparent reporting so you always know how your campaign is performing.
                  </p>
                  <p className="mt-6 text-sm text-[color:var(--color-dark)] font-semibold">
                    Complete the form or email{" "}
                    <a
                      href={`mailto:${contactMail}`}
                      className="text-[color:var(--color-riviera-blue)] hover:underline"
                    >
                      {contactMail}
                    </a>
                  </p>
                </div>
              </div>

              {/* Right: Form */}
              <div className="lg:col-span-3 p-6 sm:p-8 lg:p-10">
                {submitSuccess && (
                  <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm font-semibold text-green-800">Message sent — we&apos;ll be in touch soon!</p>
                  </div>
                )}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSubmitting(true);
                      const form = e.currentTarget;
                      const fd = new FormData(form);
                      const payload = {
                        firstName: String(fd.get("firstName") ?? ""),
                        lastName: String(fd.get("lastName") ?? ""),
                        email: String(fd.get("email") ?? ""),
                        phone: String(fd.get("phone") ?? ""),
                        company: String(fd.get("company") ?? ""),
                        website: String(fd.get("website") ?? ""),
                        postalCode: String(fd.get("postalCode") ?? ""),
                        interest: String(fd.get("interest") ?? ""),
                        message: String(fd.get("message") ?? ""),
                      };
                      try {
                        const res = await fetch("/api/advertise/inquiry", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Accept: "application/json" },
                          body: JSON.stringify(payload),
                          credentials: "same-origin",
                        });
                        if (res.ok) setSubmitSuccess(true);
                        else throw new Error();
                      } catch {
                        setSubmitSuccess(false);
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
