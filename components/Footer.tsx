export function Footer() {
  return (
    <footer className="mt-4 border-t border-[color:var(--color-border)] bg-white py-4 text-sm text-[color:var(--color-medium)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[color:var(--color-riviera-blue)] text-white flex items-center justify-center font-extrabold text-xs">
              SF
            </div>
            <div className="font-semibold text-[color:var(--color-dark)] text-sm">
              Spring-Ford Press
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a href="#newsletter" className="hover:text-[color:var(--color-dark)] transition">
              Newsletter
            </a>
            <a href="#contact" className="hover:text-[color:var(--color-dark)] transition">
              Contact
            </a>
            <a
              href="/admin"
              className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
            >
              Admin
            </a>
          </div>
        </div>
        <p className="text-xs">Independent, neighborhood-first reporting. No banner ads.</p>
      </div>
    </footer>
  );
}
