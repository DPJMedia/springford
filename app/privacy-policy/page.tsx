import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Spring-Ford Press",
  description: "Privacy Policy for Spring Ford Press – DPJ Media LLC.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="headline text-3xl font-bold text-[color:var(--color-dark)]">
            Privacy Policy
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-medium)]">
            Spring Ford Press – DPJ Media LLC
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-medium)]">
            <strong>Effective Date:</strong> February 14, 2026
          </p>

          <div className="mt-8 space-y-8 text-[color:var(--color-dark)] prose prose-sm max-w-none">
            <p className="text-[color:var(--color-medium)] leading-relaxed">
              This Privacy Policy explains how <strong>DPJ Media LLC</strong> (&quot;DPJ Media,&quot; &quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) collects, uses, shares, and protects information when you visit or
              use the Spring Ford Press Site, subscribe to newsletters, or sign up for subscriptions. It
              also explains your rights and choices regarding your information.
            </p>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                1. Information We Collect
              </h2>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">A. Information You Provide</h3>
              <ul className="mt-2 list-disc pl-6 space-y-1 text-[color:var(--color-medium)]">
                <li><strong>Account/Subscription Data:</strong> name, email, billing/payment details for subscriptions.</li>
                <li><strong>Newsletter Signup:</strong> email address.</li>
                <li><strong>Contact Forms:</strong> messages, attachments you send.</li>
              </ul>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">B. Automatically Collected Data</h3>
              <p className="mt-2 text-[color:var(--color-medium)]">We automatically collect:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1 text-[color:var(--color-medium)]">
                <li><strong>Technical Data:</strong> IP address, device and browser type, operating system.</li>
                <li><strong>Usage Data:</strong> pages viewed, timestamps, referral URLs.</li>
                <li><strong>Cookies and Similar Technologies:</strong> identifiers for site performance, analytics, and advertising.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                2. How We Use Your Information
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)]">We use information for:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1 text-[color:var(--color-medium)]">
                <li>Operating the Site and subscription services.</li>
                <li>Delivering newsletters via <strong>SendGrid</strong>.</li>
                <li>Processing subscription billing.</li>
                <li>Analytics and performance measurement.</li>
                <li>Preventing fraud or abuse.</li>
                <li>Advertising measurement where applicable.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                3. Cookies and Tracking
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)]">We use cookies and similar technologies for:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1 text-[color:var(--color-medium)]">
                <li><strong>Essential Functions:</strong> site operation.</li>
                <li><strong>Analytics:</strong> understanding how users engage with content.</li>
                <li><strong>Advertising:</strong> ad delivery and measurement related to our direct sponsors.</li>
              </ul>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                You can control cookies via your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                4. How Information Is Shared
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)]">We may share information with:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1 text-[color:var(--color-medium)]">
                <li><strong>Service providers</strong> (e.g., SendGrid, hosting, analytics).</li>
                <li><strong>Advertising partners</strong> for measurement.</li>
                <li><strong>Legal authorities</strong> when required by law or to enforce policies.</li>
                <li><strong>Business Transfers</strong> in connection with sale or reorganization.</li>
              </ul>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                We do <strong>not sell personal information</strong> in the general data broker sense. If we
                engage in data practices defined as &quot;sale&quot; or &quot;sharing&quot; under applicable privacy
                law, we will provide opt-out mechanisms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                5. Subscription &amp; Payment Information
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                Your subscription payment information is processed by third-party payment processors. We
                do not store full payment card details. You agree to provide accurate payment information
                and authorize charges for paid services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                6. Your Rights and Choices
              </h2>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">Email Communications</h3>
              <p className="mt-2 text-[color:var(--color-medium)] leading-relaxed">
                You may opt out of newsletters by clicking &quot;unsubscribe&quot; in any email or by contacting us
                at <Link href="mailto:news@dpjmedia.com" className="text-[color:var(--color-riviera-blue)] hover:underline">news@dpjmedia.com</Link>.
              </p>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">Cookies / Tracking</h3>
              <p className="mt-2 text-[color:var(--color-medium)] leading-relaxed">
                You may disable cookies in your browser. Doing so may affect Site functionality.
              </p>
              <h3 className="mt-4 font-semibold text-[color:var(--color-dark)]">Legal Rights</h3>
              <p className="mt-2 text-[color:var(--color-medium)] leading-relaxed">
                Depending on where you live, you may have rights to access, correct, delete, or restrict
                use of your personal information under applicable laws. Contact us at{" "}
                <Link href="mailto:news@dpjmedia.com" className="text-[color:var(--color-riviera-blue)] hover:underline">news@dpjmedia.com</Link>{" "}
                to exercise your rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                7. Data Retention
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                We retain your data as long as necessary for the purposes described, subject to legal
                and operational needs.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                8. Security
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                We implement reasonable safeguards to protect your information, but no system is
                completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                9. Children&apos;s Privacy
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                Our Site is not directed to children under 13, and we do not knowingly collect personal
                information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                10. International Users
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                If you access the Site from outside the United States, your data may be transferred to
                and processed in the U.S.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                11. Changes to This Policy
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)] leading-relaxed">
                We may update this policy at any time. Updated versions will be posted with a revised
                &quot;Effective Date.&quot;
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)] border-b border-[color:var(--color-border)] pb-2">
                12. Contact
              </h2>
              <p className="mt-3 text-[color:var(--color-medium)]">
                <strong>DPJ Media LLC</strong>
              </p>
              <p className="mt-1 text-[color:var(--color-medium)]">
                Email:{" "}
                <Link href="mailto:news@dpjmedia.com" className="text-[color:var(--color-riviera-blue)] hover:underline">
                  news@dpjmedia.com
                </Link>
              </p>
              <p className="mt-1 text-[color:var(--color-medium)]">
                Address: 151 S Wall St, Spring City, PA 19475
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
