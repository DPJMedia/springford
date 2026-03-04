export function Footer() {
  return (
    <footer className="mt-4 border-t border-[color:var(--color-border)] bg-white py-4 text-sm text-[color:var(--color-medium)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="masthead font-semibold text-[color:var(--color-dark)] text-sm sm:text-base" style={{ letterSpacing: "-0.02em" }}>
              Spring-Ford Press
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <a href="/contact" className="hover:text-[color:var(--color-dark)] transition">
              Contact
            </a>
            <a href="/terms-of-service" className="hover:text-[color:var(--color-dark)] transition">
              Terms of Service
            </a>
            <a href="/privacy-policy" className="hover:text-[color:var(--color-dark)] transition">
              Privacy Policy
            </a>
            <a href="/advertise" className="hover:text-[color:var(--color-dark)] transition">
              Advertise with Us
            </a>
            <a href="#" className="hover:text-[color:var(--color-dark)] transition">
              About Us
            </a>
            <a href="/subscribe" className="hover:text-[color:var(--color-dark)] transition">
              Subscribe
            </a>
            <a href="/support" className="hover:text-[color:var(--color-dark)] transition">
              Support
            </a>
            <a
              href="https://www.facebook.com/people/Spring-Ford-Press/61586338826344/?mibextid=wwXIfr&rdid=XTfJLuA7p401O1SE&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BBhYzZ3Hx%2F%3Fmibextid%3DwwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[color:var(--color-dark)] transition"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
              Facebook
            </a>
          </div>
        </div>
        <p className="text-xs">Independent, neighborhood-first reporting.</p>
        <p className="text-xs">© {new Date().getFullYear()} DPJ Media LLC</p>
      </div>
    </footer>
  );
}
