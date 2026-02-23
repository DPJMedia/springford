export function Footer() {
  return (
    <footer className="mt-4 border-t border-[color:var(--color-border)] bg-white py-4 text-sm text-[color:var(--color-medium)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.ico"
              alt="Spring-Ford Press"
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            />
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
          </div>
        </div>
        <p className="text-xs">Independent, neighborhood-first reporting.</p>
        <p className="text-xs">© {new Date().getFullYear()} DPJ Media LLC</p>
      </div>
    </footer>
  );
}
