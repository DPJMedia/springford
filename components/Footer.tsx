export function Footer() {
  return (
    <footer className="mt-8 border-t border-[color:var(--color-border)] bg-white text-sm text-[color:var(--color-medium)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Top row: brand + columns */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <span
              className="masthead font-semibold text-[color:var(--color-dark)] text-lg"
              style={{ letterSpacing: "-0.02em" }}
            >
              Spring-Ford Press
            </span>
            <p className="mt-2 text-xs leading-relaxed max-w-xs">
              Independent, neighborhood-first reporting from the Spring-Ford area.
            </p>
            {/* Social */}
            <div className="mt-4">
              <a
                href="https://www.facebook.com/people/Spring-Ford-Press/61586338826344/?mibextid=wwXIfr&rdid=XTfJLuA7p401O1SE&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BBhYzZ3Hx%2F%3Fmibextid%3DwwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
                Follow us on Facebook
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-dark)] mb-3">
              Company
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="hover:text-[color:var(--color-dark)] transition">About Us</a>
              </li>
              <li>
                <a href="/contact" className="hover:text-[color:var(--color-dark)] transition">Contact</a>
              </li>
              <li>
                <a href="/advertise" className="hover:text-[color:var(--color-dark)] transition">Advertise with Us</a>
              </li>
            </ul>
          </div>

          {/* Readers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-dark)] mb-3">
              Readers
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/subscribe" className="hover:text-[color:var(--color-dark)] transition">Subscribe</a>
              </li>
              <li>
                <a href="/support" className="hover:text-[color:var(--color-dark)] transition">Support Us</a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-dark)] mb-3">
              Legal
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/terms-of-service" className="hover:text-[color:var(--color-dark)] transition">Terms of Service</a>
              </li>
              <li>
                <a href="/privacy-policy" className="hover:text-[color:var(--color-dark)] transition">Privacy Policy</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-[color:var(--color-border)] pt-6 text-xs">
          © {new Date().getFullYear()} DPJ Media LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
