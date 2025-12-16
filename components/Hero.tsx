type HeroProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  kicker?: string;
};

export function Hero({ title, subtitle, ctaLabel, ctaHref, kicker }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[color:var(--color-panel)] px-8 py-12 shadow-soft md:px-12 md:py-16">
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(51,145,175,0.12)] via-[rgba(87,149,159,0.08)] to-[rgba(48,13,87,0.1)]" />
      <div className="relative flex flex-col gap-6 md:gap-8">
        {kicker ? (
          <span className="inline-flex w-fit items-center rounded-full bg-[rgba(51,145,175,0.12)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--color-riviera-blue)]">
            {kicker}
          </span>
        ) : null}
        <h1 className="text-4xl font-semibold leading-tight text-[color:var(--color-dark)] sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-3xl text-lg text-[color:var(--color-medium)] sm:text-xl">
          {subtitle}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={ctaHref}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-6 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg focus-visible:outline-none"
          >
            {ctaLabel}
          </a>
          <span className="text-sm text-[color:var(--color-medium)]">
            Neighborhood-first reporting. No banners. Just clarity.
          </span>
        </div>
      </div>
    </section>
  );
}


