export function NewsletterForm() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-white p-3 shadow-soft ring-1 ring-[color:var(--color-border)] md:p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-50" />
      <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="max-w-xl">
          <p className="eyebrow text-xs text-[color:var(--color-medium)]">Newsletter</p>
          <h3 className="headline mt-0.5 text-lg font-semibold text-[color:var(--color-dark)]">
            Stay ahead with the Spring-Ford briefing
          </h3>
          <p className="mt-0.5 text-xs text-[color:var(--color-medium)] leading-relaxed">
            Weekly highlights on neighborhood stories, council agendas, and upcoming
            meetings. No spam. Ever.
          </p>
        </div>
        <form
          className="flex w-full flex-col gap-1.5 md:w-[280px] md:flex-row md:items-center"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-full border border-[color:var(--color-border)] bg-white px-3 py-1.5 text-sm placeholder:text-[color:var(--color-medium)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
          />
          <button
            type="submit"
            className="inline-flex h-8 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-4 text-sm font-semibold text-white transition hover:bg-opacity-90 whitespace-nowrap"
          >
            Subscribe
          </button>
        </form>
      </div>
    </div>
  );
}

