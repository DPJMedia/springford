"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NumericTextInput } from "@/components/ad-quoter/NumericTextInput";
import { PackageBuilderSection } from "@/components/ad-quoter/PackageBuilderSection";
import { SavedQuoteDocumentModal } from "@/components/ad-quoter/SavedQuoteDocumentModal";
import {
  formatCampaignRange,
  formatSavedQuoteUpdatedAt,
} from "@/lib/advertising/formatQuoteDates";
import {
  BASELINE_MONTHLY_SITE_VIEWS,
  RATES_USD,
  REFERENCE_DEAL_PRESET,
  type PackageInput,
  type QuoteResult,
  baselineEquivalentUsd,
  computeQuote,
  emptyPackage,
  packageFromJson,
  sanitizePackage,
  suggestPackageForTotalBudget,
  viewershipMultiplier,
} from "@/lib/advertising/quoteModel";
import type { SavedAdQuote } from "@/lib/types/database";

type Tab = "package" | "budget" | "saved";

/** Supabase PostgrestError is not always `instanceof Error` — surface .message / .details / .hint */
function supabaseErrorMessage(err: unknown): string {
  if (err == null) return "Unknown error";
  if (typeof err === "object") {
    const o = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [o.message, o.details, o.hint].filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );
    if (parts.length) return parts.join(" — ");
    if (typeof o.code === "string" && o.code) return `Error code: ${o.code}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function AdQuoterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [monthlyViews, setMonthlyViews] = useState<number>(BASELINE_MONTHLY_SITE_VIEWS);
  const [viewMix, setViewMix] = useState({ homepageViews: 0, articleViews: 0 });
  const [viewsLoading, setViewsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("package");
  const [showFormula, setShowFormula] = useState(false);

  const [pkg, setPkg] = useState<PackageInput>(() => emptyPackage(3));

  const [budgetUsd, setBudgetUsd] = useState(5000);
  const [budgetDurationMonths, setBudgetDurationMonths] = useState(2);
  const [budgetPlanOpen, setBudgetPlanOpen] = useState(false);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveClient, setSaveClient] = useState("");
  const [saveStart, setSaveStart] = useState("");
  const [saveEnd, setSaveEnd] = useState("");
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** When set, the form was loaded from this row — Save updates instead of insert */
  const [loadedQuote, setLoadedQuote] = useState<SavedAdQuote | null>(null);

  const [savedQuotes, setSavedQuotes] = useState<SavedAdQuote[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  /** Click row to view document layout */
  const [documentQuote, setDocumentQuote] = useState<SavedAdQuote | null>(null);

  /** Edit metadata only (name, client, dates, saved total) */
  const [editQuoteModal, setEditQuoteModal] = useState<SavedAdQuote | null>(null);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editTotalUsd, setEditTotalUsd] = useState(0);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const quote: QuoteResult = useMemo(
    () =>
      computeQuote(
        pkg,
        monthlyViews,
        viewMix.homepageViews + viewMix.articleViews > 0 ? viewMix : undefined,
      ),
    [pkg, monthlyViews, viewMix],
  );

  const loadViews = useCallback(async () => {
    setViewsLoading(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const iso = start.toISOString();
      const [totalRes, homeRes, artRes] = await Promise.all([
        supabase.from("page_views").select("*", { count: "exact", head: true }).gte("viewed_at", iso),
        supabase
          .from("page_views")
          .select("*", { count: "exact", head: true })
          .gte("viewed_at", iso)
          .eq("view_type", "homepage"),
        supabase
          .from("page_views")
          .select("*", { count: "exact", head: true })
          .gte("viewed_at", iso)
          .eq("view_type", "article"),
      ]);
      if (!totalRes.error && totalRes.count != null && totalRes.count > 0) {
        setMonthlyViews(totalRes.count);
      } else {
        setMonthlyViews(BASELINE_MONTHLY_SITE_VIEWS);
      }
      const h = !homeRes.error && homeRes.count != null ? homeRes.count : 0;
      const a = !artRes.error && artRes.count != null ? artRes.count : 0;
      setViewMix({ homepageViews: h, articleViews: a });
    } catch {
      setMonthlyViews(BASELINE_MONTHLY_SITE_VIEWS);
      setViewMix({ homepageViews: 0, articleViews: 0 });
    } finally {
      setViewsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin, is_super_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin && !profile?.is_super_admin) {
        router.push("/");
        return;
      }
      setLoading(false);
      void loadViews();
    })();
  }, [router, supabase, loadViews]);

  function updatePkg<K extends keyof PackageInput>(key: K, value: PackageInput[K]) {
    setPkg((p) => ({ ...p, [key]: value }));
  }

  useEffect(() => {
    setPkg((p) => sanitizePackage(p));
  }, [pkg.durationMonths]);

  function applyBudgetSuggestion() {
    const mix =
      viewMix.homepageViews + viewMix.articleViews > 0 ? viewMix : undefined;
    const suggested = suggestPackageForTotalBudget(
      budgetUsd,
      budgetDurationMonths,
      monthlyViews,
      mix,
    );
    setPkg(suggested);
    setBudgetPlanOpen(true);
  }

  const loadSavedQuotes = useCallback(async () => {
    setSavedLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_ad_quotes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (!error && data) setSavedQuotes(data as SavedAdQuote[]);
      else setSavedQuotes([]);
    } catch {
      setSavedQuotes([]);
    } finally {
      setSavedLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (tab === "saved") void loadSavedQuotes();
  }, [tab, loadSavedQuotes]);

  function openSaveModal() {
    setSaveError(null);
    if (loadedQuote) {
      setSaveName(loadedQuote.name);
      setSaveClient(loadedQuote.client_name);
      setSaveStart(loadedQuote.start_date ?? "");
      setSaveEnd(loadedQuote.end_date ?? "");
    } else {
      setSaveName("");
      setSaveClient("");
      setSaveStart("");
      setSaveEnd("");
    }
    setSaveModalOpen(true);
  }

  async function submitSaveQuote() {
    const name = saveName.trim();
    if (!name) {
      setSaveError("Please enter a name for this quote.");
      return;
    }
    setSaveSubmitting(true);
    setSaveError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveError("Not signed in.");
        return;
      }
      const packageData = JSON.parse(
        JSON.stringify(sanitizePackage(pkg)),
      ) as Record<string, unknown>;

      const payload = {
        name,
        client_name: saveClient.trim(),
        start_date: saveStart.trim() || null,
        end_date: saveEnd.trim() || null,
        package_data: packageData,
        total_usd: quote.totalUsd,
        monthly_views_snapshot: monthlyViews,
        homepage_views_snapshot: viewMix.homepageViews,
        article_views_snapshot: viewMix.articleViews,
        manual_total_override: false,
      };
      if (loadedQuote?.id) {
        const { data, error } = await supabase
          .from("saved_ad_quotes")
          .update(payload)
          .eq("id", loadedQuote.id)
          .select()
          .single();
        if (error) throw error;
        if (data) setLoadedQuote(data as SavedAdQuote);
      } else {
        const { data, error } = await supabase
          .from("saved_ad_quotes")
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        if (data) setLoadedQuote(data as SavedAdQuote);
      }
      setSaveModalOpen(false);
      void loadSavedQuotes();
    } catch (e: unknown) {
      setSaveError(supabaseErrorMessage(e));
    } finally {
      setSaveSubmitting(false);
    }
  }

  function loadSavedQuote(row: SavedAdQuote) {
    setLoadedQuote(row);
    setPkg(packageFromJson(row.package_data));
    setSaveName(row.name);
    setSaveClient(row.client_name);
    setSaveStart(row.start_date ?? "");
    setSaveEnd(row.end_date ?? "");
    setTab("package");
  }

  function openEditQuoteModal(row: SavedAdQuote) {
    setEditError(null);
    setEditQuoteModal(row);
    setEditName(row.name);
    setEditClient(row.client_name);
    setEditStart(row.start_date ?? "");
    setEditEnd(row.end_date ?? "");
    setEditTotalUsd(row.total_usd ?? 0);
  }

  async function submitEditQuote() {
    if (!editQuoteModal) return;
    const name = editName.trim();
    if (!name) {
      setEditError("Please enter a name.");
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const pkg = packageFromJson(editQuoteModal.package_data);
      const views = editQuoteModal.monthly_views_snapshot ?? BASELINE_MONTHLY_SITE_VIEWS;
      const h = editQuoteModal.homepage_views_snapshot ?? 0;
      const a = editQuoteModal.article_views_snapshot ?? 0;
      const mix = h + a > 0 ? { homepageViews: h, articleViews: a } : undefined;
      const expected = computeQuote(pkg, views, mix);
      const manual_total_override = Math.abs(editTotalUsd - expected.totalUsd) > 2;

      const { data, error } = await supabase
        .from("saved_ad_quotes")
        .update({
          name,
          client_name: editClient.trim(),
          start_date: editStart.trim() || null,
          end_date: editEnd.trim() || null,
          total_usd: editTotalUsd,
          manual_total_override,
        })
        .eq("id", editQuoteModal.id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as SavedAdQuote;
      setEditQuoteModal(null);
      void loadSavedQuotes();
      if (documentQuote?.id === updated.id) setDocumentQuote(updated);
      if (loadedQuote?.id === updated.id) {
        setLoadedQuote(updated);
        setSaveName(updated.name);
        setSaveClient(updated.client_name);
        setSaveStart(updated.start_date ?? "");
        setSaveEnd(updated.end_date ?? "");
      }
    } catch (e: unknown) {
      setEditError(supabaseErrorMessage(e));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function performDeleteSavedQuote(row: SavedAdQuote) {
    try {
      const { error } = await supabase.from("saved_ad_quotes").delete().eq("id", row.id);
      if (error) throw error;
      if (loadedQuote?.id === row.id) startNewQuote();
      setDocumentQuote((q) => (q?.id === row.id ? null : q));
      void loadSavedQuotes();
    } catch (e: unknown) {
      window.alert(supabaseErrorMessage(e));
    }
  }

  function handleDeleteSavedQuote(row: SavedAdQuote) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${row.name}"? This cannot be undone.`)
    ) {
      return;
    }
    void performDeleteSavedQuote(row);
  }

  function startNewQuote() {
    setLoadedQuote(null);
    setPkg(emptyPackage(3));
    setSaveName("");
    setSaveClient("");
    setSaveStart("");
    setSaveEnd("");
    setTab("package");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
      </div>
    );
  }

  const mult = viewershipMultiplier(monthlyViews);
  const referenceMix =
    viewMix.homepageViews + viewMix.articleViews > 0 ? viewMix : undefined;
  const referenceAtCurrent = computeQuote(REFERENCE_DEAL_PRESET, monthlyViews, referenceMix);
  const budgetDelta = quote.totalUsd - budgetUsd;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7f9] via-[color:var(--color-surface)] to-[#e8eef0]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
            >
              ← Admin home
            </Link>
            <h1 className="mt-2 text-3xl font-black text-[color:var(--color-dark)] tracking-tight">
              Advertisement quoter
            </h1>
            <p className="mt-4 max-w-2xl text-[color:var(--color-medium)] leading-relaxed">
              Estimate sponsorship packages from real site traffic. Prices go up a bit automatically
              when readership grows so rate cards stay fair.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 px-5 py-4 shadow-lg backdrop-blur-sm transition-transform duration-300 hover:scale-[1.02]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-medium)]">
              Last 30 days (site)
            </p>
            <p className="text-2xl font-black text-[color:var(--color-riviera-blue)] tabular-nums">
              {viewsLoading ? "…" : monthlyViews.toLocaleString()}
            </p>
            <p className="text-xs text-[color:var(--color-medium)] mt-1">
              Page views → index ×{mult.toFixed(2)}
            </p>
            {!viewsLoading && viewMix.homepageViews + viewMix.articleViews > 0 && (
              <p className="text-xs text-[color:var(--color-medium)] mt-2 border-t border-gray-100 pt-2">
                Homepage {viewMix.homepageViews.toLocaleString()} · Article{" "}
                {viewMix.articleViews.toLocaleString()} (30d)
              </p>
            )}
          </div>
        </div>

        {loadedQuote && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-riviera-blue)]/30 bg-[color:var(--color-riviera-blue)]/5 px-4 py-3 text-sm">
            <p className="text-[color:var(--color-dark)]">
              <span className="font-bold">Loaded quote:</span> {loadedQuote.name}
              {loadedQuote.client_name ? ` · ${loadedQuote.client_name}` : ""}
            </p>
            <button
              type="button"
              onClick={startNewQuote}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[color:var(--color-dark)] hover:bg-gray-50"
            >
              New quote
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-white/60 p-1 shadow-sm border border-white/80">
          {(
            [
              ["package", "Build a package"],
              ["budget", "Budget → plan"],
              ["saved", "Saved quotes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 min-w-[140px] rounded-lg px-4 py-3 text-sm font-bold transition-all duration-300 ${
                tab === id
                  ? "bg-[color:var(--color-riviera-blue)] text-white shadow-md scale-[1.02]"
                  : "text-[color:var(--color-dark)] hover:bg-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className={
            tab === "saved" ? "grid gap-6" : "grid gap-6 lg:grid-cols-5"
          }
        >
          <div
            className={
              tab === "saved" ? "space-y-6" : "lg:col-span-3 space-y-6"
            }
          >
            {tab === "package" && (
              <section className="rounded-2xl border border-white/80 bg-white/95 p-6 shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <h2 className="text-xl font-black text-[color:var(--color-dark)] tracking-tight mb-1">
                  Build a package
                </h2>
                <p className="text-sm text-[color:var(--color-medium)] mb-6 max-w-2xl">
                  Set campaign length, then editorial &amp; newsletter, social, and site placements.
                  Check each desktop/mobile surface for the full campaign — ads run for every month in
                  the window you set.
                </p>
                <PackageBuilderSection pkg={pkg} onChange={updatePkg} />
              </section>
            )}

            {tab === "saved" && (
              <section className="rounded-2xl border border-white/80 bg-white p-6 shadow-lg">
                <h2 className="text-lg font-bold text-[color:var(--color-dark)] mb-2">Saved quotes</h2>
                <p className="text-sm text-[color:var(--color-medium)] mb-4">
                  Open a saved quote to edit the package and save again, or start from{" "}
                  <button
                    type="button"
                    onClick={startNewQuote}
                    className="font-bold text-[color:var(--color-riviera-blue)] underline"
                  >
                    New quote
                  </button>
                  .
                </p>
                {savedLoading ? (
                  <p className="text-sm text-[color:var(--color-medium)]">Loading…</p>
                ) : savedQuotes.length === 0 ? (
                  <p className="text-sm text-[color:var(--color-medium)]">
                    No saved quotes yet. Use <strong>Save quote</strong> from the live quote panel.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {savedQuotes.map((row) => (
                      <li key={row.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setDocumentQuote(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDocumentQuote(row);
                            }
                          }}
                          className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-slate-50/80 px-4 py-3 text-left outline-none transition-colors hover:border-[color:var(--color-riviera-blue)]/35 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[color:var(--color-dark)]">{row.name}</p>
                            <p className="mt-1 text-xs text-[color:var(--color-medium)] leading-relaxed">
                              <span className="font-medium text-[color:var(--color-dark)]">
                                {row.client_name?.trim() || "—"}
                              </span>
                              {" · "}
                              {formatCampaignRange(row.start_date, row.end_date)}
                              {" · "}
                              <span className="font-semibold text-[color:var(--color-dark)]">
                                ${(row.total_usd ?? 0).toLocaleString()}
                              </span>
                              {" · "}
                              Saved {formatSavedQuoteUpdatedAt(row.updated_at)}
                            </p>
                          </div>
                          <div
                            className="flex shrink-0 gap-2"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => loadSavedQuote(row)}
                              className="rounded-lg border border-[color:var(--color-riviera-blue)]/50 bg-white px-3 py-2 text-xs font-bold text-[color:var(--color-riviera-blue)] hover:bg-[color:var(--color-riviera-blue)]/5"
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditQuoteModal(row)}
                              className="rounded-lg bg-[color:var(--color-riviera-blue)] px-3 py-2 text-xs font-bold text-white hover:opacity-95"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedQuote(row)}
                              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === "budget" && (
              <section className="rounded-2xl border border-white/80 bg-white p-6 shadow-lg">
                <h2 className="text-lg font-bold text-[color:var(--color-dark)] mb-2">
                  They gave you a number
                </h2>
                <p className="text-sm text-[color:var(--color-medium)] mb-4">
                  Enter their budget and campaign length. We&apos;ll fill a package that uses most of
                  that budget (after the traffic multiplier), then show the breakdown below—without
                  leaving this tab.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Total budget (USD)">
                    <NumericTextInput
                      value={budgetUsd}
                      onCommit={setBudgetUsd}
                      min={0}
                      max={999_999_999}
                      emptyFallback={0}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold text-lg"
                    />
                  </Field>
                  <Field label="Campaign length (months)">
                    <NumericTextInput
                      value={budgetDurationMonths}
                      onCommit={setBudgetDurationMonths}
                      min={1}
                      max={24}
                      emptyFallback={1}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                    />
                  </Field>
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
                  <p>
                    <span className="font-semibold text-[color:var(--color-dark)]">
                      “Baseline” dollars (before traffic):
                    </span>{" "}
                    <strong className="text-[color:var(--color-riviera-blue)]">
                      ${baselineEquivalentUsd(budgetUsd, monthlyViews).toLocaleString()}
                    </strong>
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--color-medium)]">
                    We divide by ×{mult.toFixed(2)} so the final total can land near ${budgetUsd.toLocaleString()}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applyBudgetSuggestion}
                  className="mt-4 w-full rounded-xl bg-[color:var(--color-riviera-blue)] py-3 text-sm font-bold text-white shadow-md hover:opacity-95 transition-opacity"
                >
                  Suggest package
                </button>

                {budgetPlanOpen && (
                  <details
                    open
                    className="mt-6 rounded-xl border-2 border-dashed border-[color:var(--color-riviera-blue)]/40 bg-white p-4 transition-all"
                  >
                    <summary className="cursor-pointer text-sm font-bold text-[color:var(--color-dark)]">
                      Suggested mix (edit in &quot;Build a package&quot; anytime)
                    </summary>
                    <dl className="mt-3 grid gap-2 text-sm text-[color:var(--color-dark)]">
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Campaign months</dt>
                        <dd className="font-semibold">{pkg.durationMonths}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Sponsored articles</dt>
                        <dd className="font-semibold">{pkg.sponsoredArticleCount}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Newsletter sends / mo</dt>
                        <dd className="font-semibold">{pkg.newsletterSendsPerMonth}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Newsletter spotlights</dt>
                        <dd className="font-semibold">{pkg.newsletterSpotlightCount}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Desktop main page</dt>
                        <dd className="font-semibold">{pkg.includeDesktopMainSite ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Mobile main page</dt>
                        <dd className="font-semibold">{pkg.includeMobileMainSite ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Desktop articles</dt>
                        <dd className="font-semibold">{pkg.includeDesktopArticle ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <dt>Mobile articles</dt>
                        <dd className="font-semibold">{pkg.includeMobileArticle ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between py-1">
                        <dt>Facebook boosts</dt>
                        <dd className="font-semibold">{pkg.facebookBoostCount}</dd>
                      </div>
                    </dl>
                    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      <strong>Target budget:</strong> ${budgetUsd.toLocaleString()} ·{" "}
                      <strong>Quoted total:</strong> ${quote.totalUsd.toLocaleString()}
                      {Math.abs(budgetDelta) <= 2 ? (
                        <span className="text-green-800"> — on target</span>
                      ) : (
                        <span className="text-amber-800">
                          {" "}
                          (off by ${Math.abs(budgetDelta).toLocaleString()}
                          {budgetDelta > 0 ? ", over" : ", under"} — small leftovers happen when
                          nothing cheaper fits)
                        </span>
                      )}
                    </p>
                  </details>
                )}
              </section>
            )}

            {tab !== "saved" && (
              <>
            <button
              type="button"
              onClick={() => setShowFormula((s) => !s)}
              className="w-full rounded-xl border border-dashed border-[color:var(--color-riviera-blue)]/40 bg-white/50 px-4 py-3 text-left text-sm font-semibold text-[color:var(--color-riviera-blue)] hover:bg-white transition-colors"
            >
              {showFormula ? "▼" : "▶"} Simple explanation: how we get the number
            </button>
            {showFormula && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-[color:var(--color-medium)] leading-relaxed space-y-3">
                <p>
                  <strong className="text-[color:var(--color-dark)]">Do rates change every day?</strong>{" "}
                  The <strong>rate card</strong> (each line item&apos;s base dollars) is{" "}
                  <strong>stable</strong> until you change it in code. What moves with traffic is{" "}
                  <strong>one overall multiplier</strong> (the traffic index) applied to the{" "}
                  <em>whole</em> subtotal after line items are summed—so you&apos;re not recalculating
                  dozens of different rates from scratch each month.
                </p>
                <p>
                  <strong className="text-[color:var(--color-dark)]">Step 1 — Line items.</strong> Each
                  thing you add (article, newsletter send, site placements for the campaign, etc.) has a{" "}
                  <em>base</em> dollar amount in the rate card below. Article placements are priced
                  higher than main-page; mobile article higher than desktop article.
                </p>
                <p>
                  <strong className="text-[color:var(--color-dark)]">Step 2 — Traffic index.</strong> We
                  look at total <strong>page views</strong> (last 30 days). Versus baseline (
                  {BASELINE_MONTHLY_SITE_VIEWS.toLocaleString()}), we apply one multiplier to the
                  subtotal.
                </p>
                <p>
                  <strong className="text-[color:var(--color-dark)]">Step 3 — Optional mix nudge.</strong>{" "}
                  If we have homepage vs article view counts, <strong>article placement</strong> line
                  rates can get a <strong>small</strong> extra bump when article traffic dominates—on
                  top of the main index, not instead of it.
                </p>
                <p>
                  <strong className="text-[color:var(--color-dark)]">Step 4 — Total.</strong> Baseline
                  subtotal × traffic index → rounded total.
                </p>
                <div className="rounded-lg bg-gray-50 p-3 text-xs overflow-x-auto space-y-1">
                  {Object.entries(RATES_USD).map(([k, v]) => (
                    <div key={k}>
                      {k}: ${v}
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Live quote + reference — only on Build a package / Budget → plan */}
          {tab !== "saved" && (
          <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start flex flex-col gap-4">
            <div className="rounded-2xl border-2 border-[color:var(--color-riviera-blue)]/40 bg-white p-6 shadow-2xl">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--color-medium)]">
                Live quote
              </h3>
              <p className="mt-1 text-4xl font-black text-[color:var(--color-dark)] tabular-nums transition-all duration-300">
                ${quote.totalUsd.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-[color:var(--color-medium)]">
                ×{quote.viewershipMultiplier.toFixed(3)} traffic index · $
                {quote.subtotalBaselineUsd.toLocaleString()} before index
              </p>
              {quote.viewMixNote && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-[color:var(--color-dark)]">
                  {quote.viewMixNote}
                </p>
              )}
              <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm border-t border-gray-100 pt-4">
                {quote.lineItems.map((row) => (
                  <li
                    key={row.id}
                    className="flex justify-between gap-2 rounded-lg bg-slate-50/80 px-3 py-2 text-[color:var(--color-dark)]"
                  >
                    <span>
                      <span className="font-semibold">{row.label}</span>
                      <span className="block text-xs text-[color:var(--color-medium)]">
                        {row.detail}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums">
                      ×{row.quantity} → ${row.lineSubtotalUsd.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={openSaveModal}
                  className="w-full rounded-lg bg-[color:var(--color-riviera-blue)] py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95"
                >
                  Save quote
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm shadow-sm">
              <p className="font-bold text-amber-900">Reference bundle at today&apos;s traffic</p>
              <p className="mt-1 text-amber-950/90">
                The classic 3-month package (1 article, 6 newsletter sends, desktop main page on for
                the full campaign, + social extras) would price at{" "}
                <strong>${referenceAtCurrent.totalUsd.toLocaleString()}</strong> with{" "}
                {monthlyViews.toLocaleString()} views/mo (index ×
                {referenceAtCurrent.viewershipMultiplier.toFixed(2)}).
              </p>
            </div>
          </div>
          )}
        </div>

        {saveModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-quote-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSaveModalOpen(false);
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-6 shadow-2xl">
              <h2 id="save-quote-title" className="text-lg font-black text-[color:var(--color-dark)]">
                {loadedQuote ? "Update saved quote" : "Save quote"}
              </h2>
              <p className="mt-1 text-sm text-[color:var(--color-medium)]">
                Name this quote and add client / campaign dates. You can open it later from{" "}
                <strong>Saved quotes</strong>.
              </p>
              <div className="mt-4 space-y-3">
                <Field label="Quote name *">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                    placeholder="e.g. Acme — Spring drive"
                  />
                </Field>
                <Field label="Client">
                  <input
                    type="text"
                    value={saveClient}
                    onChange={(e) => setSaveClient(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                    placeholder="Company or contact"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start date">
                    <input
                      type="date"
                      value={saveStart}
                      onChange={(e) => setSaveStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                    />
                  </Field>
                  <Field label="End date">
                    <input
                      type="date"
                      value={saveEnd}
                      onChange={(e) => setSaveEnd(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                    />
                  </Field>
                </div>
              </div>
              {saveError && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold text-red-700 whitespace-pre-wrap">{saveError}</p>
                  {/does not exist|schema cache|Could not find/i.test(saveError) && (
                    <p className="text-xs text-[color:var(--color-medium)] leading-relaxed">
                      The <code className="rounded bg-gray-100 px-1">saved_ad_quotes</code> table may
                      not be applied yet. Run{" "}
                      <code className="rounded bg-gray-100 px-1">supabase db push</code> or execute{" "}
                      <code className="rounded bg-gray-100 px-1">
                        supabase/migrations/20260325000000_saved_ad_quotes.sql
                      </code>{" "}
                      in the SQL editor.
                    </p>
                  )}
                  {/row-level security|RLS|policy/i.test(saveError) && (
                    <p className="text-xs text-[color:var(--color-medium)]">
                      Check that your account has <strong>is_admin</strong> or{" "}
                      <strong>is_super_admin</strong> in <code className="rounded bg-gray-100 px-1">user_profiles</code>.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveSubmitting}
                  onClick={() => void submitSaveQuote()}
                  className="rounded-lg bg-[color:var(--color-riviera-blue)] px-4 py-2 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {saveSubmitting ? "Saving…" : loadedQuote ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {editQuoteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-quote-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditQuoteModal(null);
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-6 shadow-2xl">
              <h2 id="edit-quote-title" className="text-lg font-black text-[color:var(--color-dark)]">
                Edit quote details
              </h2>
              <p className="mt-1 text-sm text-[color:var(--color-medium)]">
                Update the name, client, campaign dates, or saved total. To change the package
                contents, use <strong>Load</strong> and edit in Build a package.
              </p>
              <div className="mt-4 space-y-3">
                <Field label="Quote name *">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                  />
                </Field>
                <Field label="Client">
                  <input
                    type="text"
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start date">
                    <input
                      type="date"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                    />
                  </Field>
                  <Field label="End date">
                    <input
                      type="date"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                    />
                  </Field>
                </div>
                <Field label="Quoted total (USD)">
                  <NumericTextInput
                    value={editTotalUsd}
                    onCommit={setEditTotalUsd}
                    min={0}
                    max={999_999_999}
                    emptyFallback={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold"
                  />
                  <p className="mt-1 text-xs text-[color:var(--color-medium)]">
                    If this differs from the calculator by more than $2, the quote is marked as a
                    custom total (document view hides package math).
                  </p>
                </Field>
              </div>
              {editError && (
                <p className="mt-3 text-sm font-semibold text-red-700">{editError}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditQuoteModal(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editSubmitting}
                  onClick={() => void submitEditQuote()}
                  className="rounded-lg bg-[color:var(--color-riviera-blue)] px-4 py-2 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {editSubmitting ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {documentQuote && (
          <SavedQuoteDocumentModal
            row={documentQuote}
            onClose={() => setDocumentQuote(null)}
            onDelete={performDeleteSavedQuote}
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[color:var(--color-medium)]">
        {label}
      </span>
      {children}
    </label>
  );
}
