"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xbdazgzy";
const CONTACT_EMAIL = "news@dpjmedia.com";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-xl px-4 py-10 sm:py-12">
          <h1 className="masthead text-2xl font-black tracking-tight text-[color:var(--color-dark)] text-center sm:text-3xl">
            How could we assist you?
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-medium)] text-center">
            Fill out the form or email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[color:var(--color-riviera-blue)] font-semibold hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>

          {status === "success" ? (
            <div className="mt-10 rounded-xl border border-[color:var(--color-border)] bg-white p-8 text-center shadow-soft">
              <p className="text-lg font-semibold text-[color:var(--color-dark)]">
                Thank you for reaching out.
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-medium)]">
                We&apos;ll get back to you as soon as we can.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-6 rounded-full bg-[color:var(--color-riviera-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2b7a92] transition"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-soft sm:p-8"
            >
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1.5">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)] resize-y min-h-[120px]"
                    placeholder="How can we help?"
                  />
                </div>
                {status === "error" && (
                  <p className="text-sm text-red-600">
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-full bg-[color:var(--color-dark)] py-3 text-sm font-bold text-white hover:bg-[#333] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center">
            <Link href="/" className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
