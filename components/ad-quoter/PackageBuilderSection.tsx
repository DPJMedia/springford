"use client";

import type { ReactNode } from "react";
import { AD_SLOTS } from "@/lib/advertising/adSlots";
import {
  MAX_NEWSLETTER_SENDS_PER_MONTH,
  MAX_NEWSLETTER_SPOTLIGHTS_PER_MONTH,
  RATES_USD,
  type PackageInput,
  maxSpotlightCountForCampaign,
  maxSponsoredArticlesForCampaign,
  totalNewsletterSends,
} from "@/lib/advertising/quoteModel";
import { NumericTextInput } from "@/components/ad-quoter/NumericTextInput";

type Props = {
  pkg: PackageInput;
  onChange: <K extends keyof PackageInput>(key: K, value: PackageInput[K]) => void;
};

function PlacementCheck({
  id,
  label,
  sub,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-slate-50/80 p-4 transition-colors hover:bg-slate-50"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-[color:var(--color-riviera-blue)] focus:ring-[color:var(--color-riviera-blue)]"
      />
      <span>
        <span className="block font-bold text-[color:var(--color-dark)]">{label}</span>
        <span className="mt-0.5 block text-xs text-[color:var(--color-medium)]">{sub}</span>
      </span>
    </label>
  );
}

export function PackageBuilderSection({ pkg, onChange }: Props) {
  const d = pkg.durationMonths;
  const maxSponsored = maxSponsoredArticlesForCampaign(d);
  const maxSpot = maxSpotlightCountForCampaign(d);

  function setFullDesktopPlacements(on: boolean) {
    onChange("includeDesktopMainSite", on);
    onChange("includeDesktopArticle", on);
  }

  function setFullMobilePlacements(on: boolean) {
    onChange("includeMobileMainSite", on);
    onChange("includeMobileArticle", on);
  }

  function setFullSitePlacements(on: boolean) {
    onChange("includeDesktopMainSite", on);
    onChange("includeDesktopArticle", on);
    onChange("includeMobileMainSite", on);
    onChange("includeMobileArticle", on);
  }

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold";
  const inpNarrow = `${inp} max-w-xs`;

  return (
    <div className="space-y-5">
      {/* Campaign */}
      <Card title="Campaign">
        <Field label="Length (months)">
          <NumericTextInput
            value={pkg.durationMonths}
            onCommit={(n) => onChange("durationMonths", n)}
            min={1}
            max={24}
            emptyFallback={1}
            className={inpNarrow}
          />
          <p className="mt-1 text-xs text-[color:var(--color-medium)]">
            Site ad placements below run for the full campaign when enabled (every month in this
            window).
          </p>
        </Field>
      </Card>

      {/* Editorial & email */}
      <Card title="Editorial & newsletter">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Sponsored articles">
            <NumericTextInput
              value={pkg.sponsoredArticleCount}
              onCommit={(n) => onChange("sponsoredArticleCount", n)}
              min={0}
              max={maxSponsored}
              emptyFallback={0}
              className={inp}
            />
            <p className="mt-1 text-xs text-[color:var(--color-medium)]">
              Max <strong>{maxSponsored}</strong> (one per month per advertiser) · $
              {RATES_USD.sponsoredArticle} each
            </p>
          </Field>
          <Field label="Newsletter sends / month">
            <NumericTextInput
              value={pkg.newsletterSendsPerMonth}
              onCommit={(n) => onChange("newsletterSendsPerMonth", n)}
              min={0}
              max={MAX_NEWSLETTER_SENDS_PER_MONTH}
              emptyFallback={0}
              className={inp}
            />
            <p className="mt-1 text-xs text-[color:var(--color-medium)]">
              Max <strong>{MAX_NEWSLETTER_SENDS_PER_MONTH}</strong>/mo · Total sends{" "}
              <strong>{totalNewsletterSends(pkg)}</strong> · ${RATES_USD.newsletterSend}/send
            </p>
          </Field>
          <Field label="Newsletter spotlight sections (total)" className="sm:col-span-2">
            <NumericTextInput
              value={pkg.newsletterSpotlightCount}
              onCommit={(n) => onChange("newsletterSpotlightCount", n)}
              min={0}
              max={maxSpot}
              emptyFallback={0}
              className={inp}
            />
            <p className="mt-1 text-xs text-[color:var(--color-medium)]">
              Max <strong>{MAX_NEWSLETTER_SPOTLIGHTS_PER_MONTH}</strong>/mo (
              {maxSpot} this campaign) · ${RATES_USD.newsletterSpotlight} each
            </p>
          </Field>
        </div>
      </Card>

      {/* Social */}
      <Card title="Social">
        <Field label="Sponsored Facebook / Meta posts">
          <NumericTextInput
            value={pkg.facebookBoostCount}
            onCommit={(n) => onChange("facebookBoostCount", n)}
            min={0}
            max={40}
            emptyFallback={0}
            className={inpNarrow}
          />
          <p className="mt-1 text-xs text-[color:var(--color-medium)]">${RATES_USD.facebookBoost} each</p>
        </Field>
      </Card>

      {/* Desktop */}
      <Card title="Desktop site ads">
        <p className="mb-4 text-sm text-[color:var(--color-medium)]">
          Toggle each surface for the <strong>whole campaign</strong> ({d} mo). Article inventory is
          priced higher than main page; rate card reflects that.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlacementCheck
            id="desk-main"
            label="Desktop — main page & home"
            sub={`$${RATES_USD.desktopMainSiteMonth}/mo × ${d} mo — banners, sidebars, main column`}
            checked={pkg.includeDesktopMainSite}
            onChange={(v) => onChange("includeDesktopMainSite", v)}
          />
          <PlacementCheck
            id="desk-art"
            label="Desktop — article pages"
            sub={`$${RATES_USD.desktopArticleMonth}/mo × ${d} mo — sidebars + inline on articles`}
            checked={pkg.includeDesktopArticle}
            onChange={(v) => onChange("includeDesktopArticle", v)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <BundleBtn onClick={() => setFullDesktopPlacements(true)}>Full desktop (on)</BundleBtn>
          <BundleBtn onClick={() => setFullDesktopPlacements(false)}>Full desktop (off)</BundleBtn>
        </div>
      </Card>

      {/* Mobile */}
      <Card title="Mobile site ads">
        <p className="mb-4 text-sm text-[color:var(--color-medium)]">
          Mobile article placements are the premium tier (typically highest traffic).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlacementCheck
            id="mob-main"
            label="Mobile — main page & home"
            sub={`$${RATES_USD.mobileMainSiteMonth}/mo × ${d} mo`}
            checked={pkg.includeMobileMainSite}
            onChange={(v) => onChange("includeMobileMainSite", v)}
          />
          <PlacementCheck
            id="mob-art"
            label="Mobile — article pages"
            sub={`$${RATES_USD.mobileArticleMonth}/mo × ${d} mo`}
            checked={pkg.includeMobileArticle}
            onChange={(v) => onChange("includeMobileArticle", v)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <BundleBtn onClick={() => setFullMobilePlacements(true)}>Full mobile (on)</BundleBtn>
          <BundleBtn onClick={() => setFullMobilePlacements(false)}>Full mobile (off)</BundleBtn>
        </div>
      </Card>

      {/* Cross-device */}
      <Card title="Full-site bundles">
        <p className="mb-3 text-sm text-[color:var(--color-medium)]">
          Turn <strong>all four</strong> site surfaces on or off at once (desktop + mobile, main +
          article).
        </p>
        <div className="flex flex-wrap gap-2">
          <BundleBtn onClick={() => setFullSitePlacements(true)}>All placements (on)</BundleBtn>
          <BundleBtn onClick={() => setFullSitePlacements(false)}>All placements (off)</BundleBtn>
        </div>
      </Card>

      {/* Inventory reference */}
      <details className="rounded-xl border border-gray-200 bg-slate-50/90 p-4 text-sm">
        <summary className="cursor-pointer font-bold text-[color:var(--color-dark)]">
          Ad slot inventory (reference)
        </summary>
        <ul className="mt-3 max-h-52 space-y-1 overflow-y-auto text-xs font-mono text-[color:var(--color-dark)]">
          {AD_SLOTS.map((s) => (
            <li key={s.value}>
              <span className="text-[color:var(--color-medium)]">{s.value}</span> — {s.label}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="mb-4 border-b border-gray-100 pb-2 text-sm font-black uppercase tracking-wide text-[color:var(--color-dark)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={className ?? "block"}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[color:var(--color-medium)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function BundleBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[color:var(--color-riviera-blue)]/40 bg-[color:var(--color-riviera-blue)]/5 px-3 py-1.5 text-xs font-bold text-[color:var(--color-riviera-blue)] hover:bg-[color:var(--color-riviera-blue)]/10 transition-colors"
    >
      {children}
    </button>
  );
}
