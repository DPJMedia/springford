"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";
import { QuoteSavedToast } from "@/components/ad-quoter/QuoteSavedToast";
import { NumericTextInput } from "@/components/ad-quoter/NumericTextInput";
import { Tooltip } from "@/components/Tooltip";
import {
  AD_PACKAGES,
  type AdPackageId,
  type AddOnQuantities,
  ADD_ON_MAX_QUANTITY,
  ADD_ON_PRICES_USD,
  PACKAGE_QUOTER_BASELINE_MONTHLY_VIEWS,
  buildProposalSummaryText,
  clampAddOns,
  computePackageQuoter,
  defaultAddOns,
  packageQuoterFromJson,
  type PackageQuoterPersistedV2,
  type PackageQuoterResult,
} from "@/lib/advertising/packageQuoterModel";
import { getAdSlotTableLabel } from "@/lib/advertising/adSlots";
import type { SavedAdQuote } from "@/lib/types/database";

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

function AdQuoterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [packageId, setPackageId] = useState<AdPackageId>("article-premier");
  const [addOns, setAddOns] = useState<AddOnQuantities>(() => defaultAddOns());
  const [campaignMonths, setCampaignMonths] = useState<1 | 2 | 3>(1);
  const [monthlyViews, setMonthlyViews] = useState<number | null>(null);
  const [trafficIndexActive, setTrafficIndexActive] = useState(false);
  const [viewsLoading, setViewsLoading] = useState(true);

  const [proposalAdvertiser, setProposalAdvertiser] = useState("");
  const [proposalText, setProposalText] = useState<string | null>(null);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveClient, setSaveClient] = useState("");
  const [saveStart, setSaveStart] = useState("");
  const [saveEnd, setSaveEnd] = useState("");
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadedQuote, setLoadedQuote] = useState<SavedAdQuote | null>(null);
  const [quoteSavedOpen, setQuoteSavedOpen] = useState(false);
  const [editHydrating, setEditHydrating] = useState(false);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);
  const [finishSubmitting, setFinishSubmitting] = useState(false);
  const [copyProposalError, setCopyProposalError] = useState(false);

  const isEditingFromSaved = Boolean(
    editId &&
      loadedQuote?.id &&
      editId.toLowerCase() === loadedQuote.id.toLowerCase(),
  );

  const quote: PackageQuoterResult = useMemo(() => {
    const q = computePackageQuoter(
      packageId,
      addOns,
      campaignMonths,
      monthlyViews,
      trafficIndexActive,
    );
    if (!q) throw new Error("Invalid package selection");
    return q;
  }, [packageId, addOns, campaignMonths, monthlyViews, trafficIndexActive]);

  const loadViews = useCallback(async () => {
    setViewsLoading(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const iso = start.toISOString();
      const { count, error } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", iso);
      if (!error && count != null && count > 0) {
        setMonthlyViews(count);
        setTrafficIndexActive(true);
      } else {
        setMonthlyViews(null);
        setTrafficIndexActive(false);
      }
    } catch {
      setMonthlyViews(null);
      setTrafficIndexActive(false);
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
    })();
  }, [router, supabase]);

  useEffect(() => {
    if (loading) return;
    if (editId) return;
    void loadViews();
  }, [loading, editId, loadViews]);

  useEffect(() => {
    if (loading) return;
    if (!editId) return;

    let cancelled = false;
    (async () => {
      setEditHydrating(true);
      setEditLoadError(null);
      const { data, error } = await supabase.from("saved_ad_quotes").select("*").eq("id", editId).single();
      if (cancelled) return;
      if (error || !data) {
        setEditLoadError(supabaseErrorMessage(error ?? new Error("Quote not found.")));
        setEditHydrating(false);
        return;
      }
      const row = data as SavedAdQuote;
      const v2 = packageQuoterFromJson(row.package_data);
      if (v2) {
        setPackageId(v2.packageId);
        setAddOns(clampAddOns(v2.addOns));
        setCampaignMonths(v2.campaignMonths);
      }
      setProposalAdvertiser(row.client_name?.trim() ?? "");
      const mv = row.monthly_views_snapshot;
      if (mv != null && mv > 0) {
        setMonthlyViews(mv);
        setTrafficIndexActive(true);
      } else {
        setMonthlyViews(null);
        setTrafficIndexActive(false);
      }
      setLoadedQuote(row);
      setSaveName(row.name);
      setSaveClient(row.client_name ?? "");
      setSaveStart(row.start_date ?? "");
      setSaveEnd(row.end_date ?? "");
      setProposalText(null);
      setEditHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, editId, supabase]);

  function updateAddOn<K extends keyof AddOnQuantities>(key: K, value: AddOnQuantities[K]) {
    setAddOns((prev) => clampAddOns({ ...prev, [key]: value }));
  }

  function resetQuote() {
    router.replace("/admin/ad-quoter");
    setLoadedQuote(null);
    setPackageId("article-premier");
    setAddOns(defaultAddOns());
    setCampaignMonths(1);
    setProposalText(null);
    setSaveName("");
    setSaveClient("");
    setSaveStart("");
    setSaveEnd("");
  }

  function openSaveModal() {
    setSaveError(null);
    if (loadedQuote) {
      setSaveName(loadedQuote.name);
      setSaveClient(proposalAdvertiser.trim() || loadedQuote.client_name || "");
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

  async function persistQuote(): Promise<{ ok: true } | { ok: false; error: string }> {
    const name = saveName.trim();
    if (!name) {
      return { ok: false, error: "Please enter a name for this quote." };
    }
    // Advertiser on the main form (proposal section); save modal also edits client — prefer live proposal field.
    const clientNamePersisted = proposalAdvertiser.trim() || saveClient.trim();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { ok: false, error: "Not signed in." };
      }
      const packageData: PackageQuoterPersistedV2 = {
        quoterVersion: 2,
        packageId,
        campaignMonths,
        addOns: clampAddOns(addOns),
      };
      const payload = {
        name,
        client_name: clientNamePersisted,
        start_date: saveStart.trim() || null,
        end_date: saveEnd.trim() || null,
        package_data: packageData as unknown as Record<string, unknown>,
        total_usd: quote.campaignTotalUsd,
        monthly_views_snapshot: monthlyViews,
        homepage_views_snapshot: 0,
        article_views_snapshot: 0,
        manual_total_override: false,
      };
      const existingRowId = loadedQuote?.id ?? (editId || null);
      if (existingRowId) {
        const { data, error } = await supabase
          .from("saved_ad_quotes")
          .update(payload)
          .eq("id", existingRowId)
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
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, error: supabaseErrorMessage(e) };
    }
  }

  async function submitSaveQuote() {
    setSaveSubmitting(true);
    setSaveError(null);
    const result = await persistQuote();
    setSaveSubmitting(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSaveModalOpen(false);
    setQuoteSavedOpen(true);
  }

  async function handleFinishEdit() {
    setFinishSubmitting(true);
    setSaveError(null);
    const result = await persistQuote();
    setFinishSubmitting(false);
    if (!result.ok) {
      setSaveError(result.error);
      openSaveModal();
      return;
    }
    setQuoteSavedOpen(true);
    // Let toast state commit before clearing ?edit= (avoids losing confirmation on some navigations).
    queueMicrotask(() => {
      router.replace("/admin/ad-quoter");
    });
  }

  function handleCancelEdit() {
    router.push("/admin/ad-quoter/saved");
  }

  function generateProposal() {
    const text = buildProposalSummaryText({
      advertiserName: proposalAdvertiser,
      result: quote,
    });
    setProposalText(text);
  }

  function downloadProposal() {
    if (!proposalText) return;
    const blob = new Blob([proposalText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `springford-press-proposal-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyProposal() {
    if (!proposalText) return;
    try {
      await navigator.clipboard.writeText(proposalText);
      setCopyProposalError(false);
    } catch {
      setCopyProposalError(true);
      window.setTimeout(() => setCopyProposalError(false), 5000);
    }
  }

  if (loading || (Boolean(editId) && editHydrating)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  if (editId && editLoadError) {
    return (
      <>
        <AdminPageHeader title="Ad Quoter" description="Could not load the saved quote." reserveActionsPanelSpace={false} />
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {editLoadError}
        </div>
        <p className="mt-4 text-sm text-[var(--admin-text-muted)]">
          <button
            type="button"
            onClick={() => router.replace("/admin/ad-quoter/saved")}
            className="font-semibold text-[var(--admin-accent)] underline hover:no-underline"
          >
            Back to saved quotes
          </button>
        </p>
      </>
    );
  }

  const livePanel = (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
        Live quote
      </h2>
      <div className="mt-3 space-y-3 text-sm text-[var(--admin-text)]">
        <div>
          <p className="font-semibold text-base">{quote.pkg.name}</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[var(--admin-text-muted)]">
            {quote.pkg.slotIds.map((id) => (
              <li key={id} className="text-xs">
                {getAdSlotTableLabel(id)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-[var(--admin-text-muted)]">
          Placements use site inventory labels (tiers match ad manager).
        </p>
        <div className="border-t border-[var(--admin-border)] pt-3 space-y-2">
          <div className="flex justify-between gap-2">
            <span>Published package rate</span>
            <span className="tabular-nums font-medium">${quote.basePackagePriceUsd.toLocaleString()}/mo</span>
          </div>
          {quote.trafficIndexActive ? (
            <div className="flex justify-between gap-2">
              <span>Traffic-adjusted package</span>
              <span
                className={`tabular-nums font-medium ${
                  quote.indexedPackagePriceUsd > quote.basePackagePriceUsd
                    ? "text-[var(--admin-accent)]"
                    : "text-[var(--admin-text)]"
                }`}
              >
                ${quote.indexedPackagePriceUsd.toLocaleString()}/mo
                {quote.indexedPackagePriceUsd === quote.basePackagePriceUsd ? (
                  <span className="ml-1 text-[10px] font-normal text-[var(--admin-text-muted)]">(same)</span>
                ) : null}
              </span>
            </div>
          ) : (
            <p className="text-xs text-[var(--admin-text-muted)]">
              Traffic data unavailable — published package rate is used.
            </p>
          )}
        </div>
        {quote.addOnLineItems.length > 0 ? (
          <div className="space-y-1.5 border-t border-[var(--admin-border)] pt-3">
            <p className="text-xs font-semibold uppercase text-[var(--admin-text-muted)]">Add-ons</p>
            {quote.addOnLineItems.map((row) => (
              <div key={row.id} className="flex justify-between gap-2 text-xs">
                <span>
                  {row.label}
                  {row.quantity > 1 ? ` × ${row.quantity}` : ""}
                </span>
                <span className="tabular-nums">${row.lineTotalUsd.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : null}
        {addOns.categoryExclusivity ? (
          <p className="rounded-md bg-[var(--admin-accent)]/15 px-2 py-1.5 text-xs font-semibold text-[var(--admin-accent)]">
            Category exclusivity included (+${ADD_ON_PRICES_USD.categoryExclusivityMonthly}/mo)
          </p>
        ) : null}
        <div className="border-t border-[var(--admin-border)] pt-3 space-y-2">
          <div className="flex justify-between gap-2 font-semibold">
            <span>Monthly total</span>
            <span className="tabular-nums">${quote.monthlyTotalUsd.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-2 text-[var(--admin-text-muted)]">
            <span>Campaign ({quote.campaignMonths} mo)</span>
            <span className="tabular-nums text-[var(--admin-text)] font-semibold">
              ${quote.campaignTotalUsd.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="border-t border-[var(--admin-border)] pt-3 space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <span>Impressions / month (package)</span>
            <span className="tabular-nums">{quote.impressionsPerMonth.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Impressions (campaign)</span>
            <span className="tabular-nums">{quote.impressionsCampaignTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <span className="inline-flex items-center gap-1">
              CPM (published rate card)
              <Tooltip text="CPM (cost per mille) is the cost per 1,000 impressions on this package’s placements. This figure matches the published rate card before traffic adjustment." />
            </span>
            <span className="tabular-nums">${quote.baseCpmUsd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <span className="inline-flex items-center gap-1">
              CPM (traffic-adjusted)
              <Tooltip text="CPM recalculated from the traffic-adjusted package price divided by monthly impressions × 1,000. It moves with site traffic; add-on spend is not included in CPM." />
            </span>
            <span className="tabular-nums font-medium">${quote.indexedCpmUsd.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const iconRefresh = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
  const iconSave = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l3 3m0 0l3-3m-3 3V4"
      />
    </svg>
  );
  const iconPlus = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
  const iconList = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
  const iconCheck = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
  const iconCancel = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const actionsPanel = isEditingFromSaved ? (
    <AdminActionsPanel
      sections={[
        {
          title: "",
          items: [
            {
              label: finishSubmitting ? "Saving…" : "Finish",
              icon: iconCheck,
              onClick: () => {
                if (!finishSubmitting) void handleFinishEdit();
              },
            },
            {
              label: "Cancel",
              icon: iconCancel,
              onClick: handleCancelEdit,
            },
          ],
        },
      ]}
    />
  ) : (
    <AdminActionsPanel
      sections={[
        {
          title: "Traffic",
          items: [
            {
              label: viewsLoading ? "Refreshing…" : "Refresh 30-day traffic",
              icon: iconRefresh,
              onClick: () => {
                if (!viewsLoading) void loadViews();
              },
            },
          ],
        },
        {
          title: "Quote",
          items: [
            {
              label: "Save quote",
              icon: iconSave,
              onClick: openSaveModal,
            },
            {
              label: "New quote",
              icon: iconPlus,
              onClick: resetQuote,
            },
          ],
        },
        {
          title: "Saved",
          items: [
            {
              label: "Saved quotes",
              icon: iconList,
              href: "/admin/ad-quoter/saved",
            },
          ],
        },
      ]}
    />
  );

  return (
    <>
      <AdminPageHeader
        title="Ad Quoter"
        description="Package-based quotes with add-ons, traffic-adjusted package pricing, and proposal export."
        reserveActionsPanelSpace={false}
      />

      <AdminPageLayout>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-6">
          <div className="min-w-0 flex-1 space-y-6">
          {isEditingFromSaved ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--admin-accent)]/35 bg-[var(--admin-accent)]/10 px-4 py-3 text-sm text-[var(--admin-text)]">
                <p className="hidden xl:block">
                  Editing a saved quote — use <span className="font-semibold">Finish</span> in the right panel to save changes, or{" "}
                  <span className="font-semibold">Cancel</span> to return to saved quotes without saving.
                </p>
                <p className="xl:hidden">
                  Editing a saved quote. Use <span className="font-semibold">Finish</span> or <span className="font-semibold">Cancel</span>{" "}
                  below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 xl:hidden">
                <button
                  type="button"
                  disabled={finishSubmitting}
                  onClick={() => void handleFinishEdit()}
                  className="min-h-[44px] flex-1 rounded-lg bg-[var(--admin-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] disabled:opacity-50"
                >
                  {finishSubmitting ? "Saving…" : "Finish"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="min-h-[44px] flex-1 rounded-lg border border-[var(--admin-border)] px-4 py-2.5 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
            {viewsLoading ? (
              <span>Loading traffic…</span>
            ) : trafficIndexActive && monthlyViews != null ? (
              <span>
                Trailing 30-day traffic:{" "}
                <strong className="text-[var(--admin-text)]">{monthlyViews.toLocaleString()}</strong> page views.
                Published package rates apply when traffic is at or below{" "}
                {PACKAGE_QUOTER_BASELINE_MONTHLY_VIEWS.toLocaleString()}/mo; above that, only the{" "}
                <strong className="text-[var(--admin-text)]">package</strong> price increases (add-ons stay flat).
              </span>
            ) : (
              <span>
                Traffic data unavailable — published package rates apply (no traffic-based change).
              </span>
            )}
          </div>

          <div className="space-y-4 xl:hidden">{livePanel}</div>

          <div className="space-y-6">
              <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-[var(--admin-text)] mb-4">1. Package</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AD_PACKAGES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPackageId(p.id)}
                      className={`text-left rounded-lg border p-3 transition ${
                        packageId === p.id
                          ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 ring-1 ring-[var(--admin-accent)]"
                          : "border-[var(--admin-border)] hover:bg-[var(--admin-table-row-hover)]"
                      }`}
                    >
                      <p className="font-semibold text-[var(--admin-text)]">{p.name}</p>
                      <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                        ${p.basePriceUsd.toLocaleString()}/mo · {p.impressionsPerMonth.toLocaleString()} imp/mo · CPM ${p.baseCpmUsd.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-[var(--admin-text)] mb-1">2. Add-ons</h2>
                <p className="text-xs text-[var(--admin-text-muted)] mb-4">
                  Add-on pricing is flat (not traffic-indexed). Quantity per line: 0–{ADD_ON_MAX_QUANTITY}.
                </p>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-sm text-[var(--admin-text)]">Sponsored article ($150 ea)</label>
                    <NumericTextInput
                      value={addOns.sponsoredArticles}
                      onCommit={(n) => updateAddOn("sponsoredArticles", n)}
                      min={0}
                      max={ADD_ON_MAX_QUANTITY}
                      emptyFallback={0}
                      liveUpdate
                      className="w-20 rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-sm text-[var(--admin-text)]">Newsletter mention ($40/send)</label>
                    <NumericTextInput
                      value={addOns.newsletterMentions}
                      onCommit={(n) => updateAddOn("newsletterMentions", n)}
                      min={0}
                      max={ADD_ON_MAX_QUANTITY}
                      emptyFallback={0}
                      liveUpdate
                      className="w-20 rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-sm text-[var(--admin-text)]">Newsletter spotlight ($95/send)</label>
                    <NumericTextInput
                      value={addOns.newsletterSpotlights}
                      onCommit={(n) => updateAddOn("newsletterSpotlights", n)}
                      min={0}
                      max={ADD_ON_MAX_QUANTITY}
                      emptyFallback={0}
                      liveUpdate
                      className="w-20 rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-sm text-[var(--admin-text)]">Facebook sponsored post ($75 ea)</label>
                    <NumericTextInput
                      value={addOns.facebookPosts}
                      onCommit={(n) => updateAddOn("facebookPosts", n)}
                      min={0}
                      max={ADD_ON_MAX_QUANTITY}
                      emptyFallback={0}
                      liveUpdate
                      className="w-20 rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-content-bg)]">
                    <input
                      type="checkbox"
                      id="cat-excl"
                      checked={addOns.categoryExclusivity}
                      onChange={(e) => updateAddOn("categoryExclusivity", e.target.checked)}
                      className="mt-0.5 w-5 h-5 accent-[var(--admin-accent)] border-[var(--admin-border)] rounded cursor-pointer"
                    />
                    <label htmlFor="cat-excl" className="text-sm text-[var(--admin-text)] cursor-pointer">
                      Category exclusivity (+$175/mo)
                    </label>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-[var(--admin-text)] mb-3">3. Campaign length</h2>
                <div className="flex flex-wrap gap-2">
                  {([1, 2, 3] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCampaignMonths(m)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        campaignMonths === m
                          ? "bg-[var(--admin-accent)] text-white"
                          : "border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                      }`}
                    >
                      {m} month{m === 1 ? "" : "s"}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-[var(--admin-text)] mb-3">4. Proposal summary</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">
                      Advertiser name
                    </label>
                    <input
                      type="text"
                      value={proposalAdvertiser}
                      onChange={(e) => setProposalAdvertiser(e.target.value)}
                      placeholder="e.g. Main Street Bakery"
                      className="w-full max-w-md rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={generateProposal}
                      className="rounded-lg bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition"
                    >
                      Generate proposal text
                    </button>
                    {proposalText ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void copyProposal()}
                          className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={downloadProposal}
                          className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                        >
                          Download .txt
                        </button>
                      </>
                    ) : null}
                  </div>
                  {copyProposalError ? (
                    <p className="text-xs text-red-400">Could not copy to clipboard.</p>
                  ) : null}
                  {proposalText ? (
                    <textarea
                      readOnly
                      value={proposalText}
                      rows={18}
                      className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-3 py-2 text-xs font-mono text-[var(--admin-text)]"
                    />
                  ) : (
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      Generate a plain-text proposal you can paste into email or a contract draft.
                    </p>
                  )}
                </div>
              </section>

          </div>
          </div>

          {/* Desktop: live quote (middle) + actions (right), one sticky unit */}
          <aside className="hidden shrink-0 xl:flex xl:flex-row xl:items-start xl:gap-4 xl:sticky xl:top-6 xl:z-[5]">
            <div className="w-[20rem] shrink-0">{livePanel}</div>
            <div className="w-64 shrink-0">{actionsPanel}</div>
          </aside>
        </div>
      </AdminPageLayout>

      {saveModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSaveModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--admin-text)]">Save quote</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--admin-text-muted)]">Name</label>
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--admin-text-muted)]">Client</label>
                <input
                  value={saveClient}
                  onChange={(e) => setSaveClient(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--admin-text-muted)]">Start</label>
                  <input
                    type="date"
                    value={saveStart}
                    onChange={(e) => setSaveStart(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-2 py-2 text-sm text-[var(--admin-text)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--admin-text-muted)]">End</label>
                  <input
                    type="date"
                    value={saveEnd}
                    onChange={(e) => setSaveEnd(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-content-bg)] px-2 py-2 text-sm text-[var(--admin-text)]"
                  />
                </div>
              </div>
              {saveError ? <p className="text-sm text-red-400">{saveError}</p> : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveSubmitting}
                onClick={() => void submitSaveQuote()}
                className="rounded-lg bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saveSubmitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <QuoteSavedToast open={quoteSavedOpen} onClose={() => setQuoteSavedOpen(false)} />
    </>
  );
}

export default function AdQuoterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
        </div>
      }
    >
      <AdQuoterPageInner />
    </Suspense>
  );
}
