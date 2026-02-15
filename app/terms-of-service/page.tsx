import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Spring-Ford Press",
  description: "Terms of Service for Spring Ford Press – DPJ Media LLC.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="headline text-3xl font-bold text-[color:var(--color-dark)]">
            Terms of Service
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-medium)]">
            Spring Ford Press – DPJ Media LLC
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-medium)]">
            <strong>Effective Date:</strong> February 14, 2026
          </p>

          <div className="mt-8 space-y-8 text-[color:var(--color-dark)] prose prose-sm max-w-none">
            <p className="text-[color:var(--color-medium)] leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Spring Ford Press
              website (the &quot;Site&quot;), newsletters, subscription services, and any other services
              operated by <strong>DPJ Media LLC</strong> (&quot;DPJ Media,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;). Use of the Site means you agree to these Terms. If you do not agree, do not use
              the Site or our services.
            </p>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                1. Who We Are
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                <strong>Spring Ford Press</strong> is a local news publisher serving Spring City,
                Royersford, Limerick, and Upper Providence, Pennsylvania.
              </p>
              <p className="mt-2 text-[color:var(--color-medium)]">
                <strong>Operator:</strong> DPJ Media LLC
              </p>
              <p className="mt-1 text-[color:var(--color-medium)]">
                <strong>Contact Email:</strong>{" "}
                <Link href="mailto:news@dpjmedia.com" className="text-[color:var(--color-riviera-blue)] hover:underline">
                  news@dpjmedia.com
                </Link>
              </p>
              <p className="mt-1 text-[color:var(--color-medium)]">
                <strong>Business Address:</strong> 151 S Wall St, Spring City, PA 19475
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                2. Acceptance of Terms
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                By accessing or using the Site or any DPJ Media services (including paid subscriptions
                or newsletters), you agree to be bound by these Terms. We may revise these Terms at any
                time — changes take effect when posted. Continued use after changes means you accept the
                updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                3. Use of Our Services
              </h2>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">License to Use</h3>
              <p className="mt-2 text-[color:var(--color-medium)] leading-relaxed">
                We grant you a limited, non-exclusive, revocable license to access and use the Site for
                personal, non-commercial purposes.
              </p>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">Restrictions</h3>
              <p className="mt-2 text-[color:var(--color-medium)]">You may not:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1 text-[color:var(--color-medium)]">
                <li>Reproduce, distribute, scrape, or republish content at scale without written permission.</li>
                <li>Interfere with site security or operations.</li>
                <li>Impersonate others or misrepresent affiliations.</li>
                <li>Attempt unauthorized access to parts of the Site.</li>
                <li>Use the Site for unlawful or abusive purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                4. Intellectual Property
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                All content on the Site (including articles, logos, graphics, video, text, and layout)
                is owned by DPJ Media or its licensors. You may share links and short excerpts with
                attribution and a link back, but <strong>commercial reuse</strong> or republication
                requires written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                5. Subscription Services
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                We offer subscription plans that provide access to premium articles and newsletters.
              </p>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">Billing</h3>
              <ul className="mt-2 list-disc pl-6 space-y-1 text-[color:var(--color-medium)]">
                <li>Subscription fees are charged as described at checkout. You are responsible for payment information and fees.</li>
                <li>We may change pricing; changes apply prospectively.</li>
                <li>No refunds unless required by law or at our discretion.</li>
              </ul>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">Account Termination</h3>
              <p className="mt-2 text-[color:var(--color-medium)] leading-relaxed">
                We can suspend or terminate access for violations of these Terms or non-payment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                6. Advertising and Sponsors
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                The Site displays advertisements from direct local sponsors and other partners.
                Advertisements do not imply endorsement by DPJ Media of advertised products or services.
                You agree that we are not liable for the content or accuracy of third-party ads.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                7. User Content
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                We currently do <strong>not allow comments or public posting</strong> on the Site. If
                this changes in the future, you will be notified and additional policies may apply.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                8. Links and Third-Party Content
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                The Site may include links to external sites, services, or content. We are not
                responsible for third-party practices, content, or policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                9. Disclaimers
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                THE SITE IS PROVIDED <em>&quot;AS IS&quot;</em> AND <em>&quot;AS AVAILABLE&quot;</em> WITHOUT WARRANTIES
                OF ANY KIND. DPJ MEDIA DOES NOT GUARANTEE ACCURACY, COMPLETENESS, OR TIMELINESS OF
                CONTENT. News and information may change rapidly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                10. Limitation of Liability
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DPJ MEDIA AND ITS AFFILIATES WILL NOT BE LIABLE
                FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR
                USE OF THE SITE. If liability is required by law, total liability will not exceed the
                greater of $100 or the amount you paid in the last 12 months.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                11. Indemnification
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                You agree to defend and indemnify DPJ Media from claims arising out of your breach of
                these Terms or your misuse of the Site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                12. Governing Law
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                These Terms are governed by the laws of the <strong>Commonwealth of Pennsylvania</strong>.
                Any disputes will be resolved in state or federal courts in Pennsylvania.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                13. Contact
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)]">
                For questions about these Terms:{" "}
                <Link href="mailto:news@dpjmedia.com" className="text-[color:var(--color-riviera-blue)] hover:underline">
                  news@dpjmedia.com
                </Link>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
