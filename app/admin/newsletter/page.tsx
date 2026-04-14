"use client";

import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";
import {
  TransactionalEmailTypesList,
  TransactionalEmailsMain,
} from "@/components/admin/TransactionalEmailSection";
import {
  transactionalEmailBrandingFromTenantContext,
} from "@/lib/emails/emailBranding";
import { getTransactionalEmailPreviews } from "@/lib/emails/transactionalPreviews";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AdminTableSortTh } from "@/components/admin/AdminTableSortTh";
import { cycleSortTriPhase, type SortTriPhase } from "@/lib/admin/tableSort";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "sent" | "scheduled";
  recipients_type: string;
  template_id: string | null;
  preview_text: string;
  sent_at: string | null;
  recipient_count: number | null;
  created_at: string;
  updated_at: string;
  template_name?: string;
}

interface Template {
  id: string;
  name: string;
  blocks: unknown[];
  created_at: string;
  updated_at: string;
}

type TemplateMetricsRow = {
  recipients: number;
  sends: number;
  openPct: number | null;
  ctrPct: number | null;
  lastSent: string | null;
};

type CampaignFilter = "all" | "draft" | "sent";

/** Match analytics sidebar filter chips (translucent orange + orange text when selected). */
const navItemActive = "bg-[var(--admin-accent)]/20 text-[var(--admin-accent)]";
const navItemInactive =
  "text-[var(--admin-text)] hover:bg-[var(--admin-card-bg)]";

// ─── Shared Modal Components ──────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
          <p className="text-sm text-[var(--admin-text-muted)]">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-xl hover:bg-[var(--admin-table-header-bg)] transition">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${
              danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-[var(--admin-accent)] text-black hover:opacity-90"
            }`}>
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputModal({ title, message, defaultValue, confirmLabel, onConfirm, onCancel }: {
  title: string; message: string; defaultValue?: string; confirmLabel?: string;
  onConfirm: (value: string) => void; onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue || "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold text-white mb-1">{title}</h2>
          <p className="text-sm text-[var(--admin-text-muted)] mb-4">{message}</p>
          <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-[var(--admin-border)] rounded-xl bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
            onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onConfirm(value.trim()); if (e.key === "Escape") onCancel(); }} />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-xl hover:bg-[var(--admin-table-header-bg)] transition">
            Cancel
          </button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} disabled={!value.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[var(--admin-accent)] text-black rounded-xl hover:opacity-90 transition disabled:opacity-40">
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "sent" ? "Sent" : status === "scheduled" ? "Scheduled" : status === "draft" ? "Draft" : status;
  const isSent = status === "sent";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] ${
        isSent ? "text-emerald-400" : "text-[var(--admin-text)]"
      }`}
    >
      {label}
    </span>
  );
}

function RecipientsBadge({ type }: { type: string }) {
  if (type === "all_users") return <span className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>All Users</span>;
  if (type === "super_admins") return <span className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>Super Admins</span>;
  return <span className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Subscribers</span>;
}

// ─── Main Inner ───────────────────────────────────────────────────────────────

function NewsletterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "campaigns" | "templates") || "campaigns";

  const [tab, setTab] = useState<"campaigns" | "templates">(initialTab);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateMetrics, setTemplateMetrics] = useState<Record<string, TemplateMetricsRow>>({});
  const [tmplSortCol, setTmplSortCol] = useState<string | null>(null);
  const [tmplSortPhase, setTmplSortPhase] = useState<SortTriPhase>(0);
  const [campSortCol, setCampSortCol] = useState<string | null>(null); // "name" | "recipients" | "status"
  const [campSortPhase, setCampSortPhase] = useState<SortTriPhase>(0);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void } | null>(null);
  const [inputModal, setInputModal] = useState<{ title: string; message: string; defaultValue?: string; confirmLabel?: string; onConfirm: (v: string) => void } | null>(null);

  // Filters
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>("all");
  const [templateSearch, setTemplateSearch] = useState("");

  const supabase = createClient();
  const tenant = useTenant();
  const { id: tenantId } = tenant;

  const transactionalPreviews = useMemo(
    () =>
      getTransactionalEmailPreviews(transactionalEmailBrandingFromTenantContext(tenant)),
    [tenant.name, tenant.domain, tenant.from_email, tenant.from_name],
  );
  const [transactionalEmailId, setTransactionalEmailId] = useState(
    () => transactionalPreviews[0]?.id ?? ""
  );

  useEffect(() => {
    setSelectedCampaignId(null);
    setSelectedTemplateId(null);
  }, [tab, campaignFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: tmplData }, { data: campData }] = await Promise.all([
      supabase
        .from("newsletter_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("newsletter_campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
    ]);
    const tmplList: Template[] = tmplData || [];
    setTemplates(tmplList);
    const campList: Campaign[] = (campData || []).map((c) => ({
      ...c,
      template_name: tmplList.find((t) => t.id === c.template_id)?.name || null,
    }));
    setCampaigns(campList);

    const sentIds = campList.filter((c) => c.status === "sent").map((c) => c.id);
    const metrics: Record<string, TemplateMetricsRow> = {};
    for (const t of tmplList) {
      metrics[t.id] = { recipients: 0, sends: 0, openPct: null, ctrPct: null, lastSent: null };
    }
    const agg: Record<string, { o: number; d: number; c: number }> = {};
    for (const id of sentIds) agg[id] = { o: 0, d: 0, c: 0 };
    if (sentIds.length > 0) {
      const { data: evs } = await supabase
        .from("newsletter_email_events")
        .select("campaign_id, event")
        .in("campaign_id", sentIds);
      for (const row of evs || []) {
        const a = agg[row.campaign_id as string];
        if (!a) continue;
        const ev = row.event as string;
        if (ev === "open") a.o++;
        if (ev === "delivered") a.d++;
        if (ev === "click") a.c++;
      }
    }
    for (const t of tmplList) {
      const sent = campList.filter((c) => c.template_id === t.id && c.status === "sent");
      let rec = 0;
      let o = 0;
      let d = 0;
      let c = 0;
      let lastSent: string | null = null;
      for (const camp of sent) {
        rec += camp.recipient_count || 0;
        const x = agg[camp.id] || { o: 0, d: 0, c: 0 };
        o += x.o;
        d += x.d;
        c += x.c;
        if (camp.sent_at && (!lastSent || camp.sent_at > lastSent)) lastSent = camp.sent_at;
      }
      metrics[t.id] = {
        recipients: rec,
        sends: sent.length,
        openPct: d > 0 ? Math.round((o / d) * 1000) / 10 : null,
        ctrPct: d > 0 ? Math.round((c / d) * 1000) / 10 : null,
        lastSent,
      };
    }
    setTemplateMetrics(metrics);
    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("user_profiles").select("is_admin,is_super_admin").eq("id", user.id).single();
      if (!p?.is_admin && !p?.is_super_admin) { router.push("/admin/articles"); return; }
      await loadData();
    }
    init();
  }, [router, supabase, tenantId, loadData]);

  function deleteCampaign(c: Campaign) {
    const isSent = c.status === "sent";
    setConfirmModal({
      title: isSent ? `Remove "${c.name}"?` : `Delete "${c.name}"?`,
      message: isSent
        ? "This won't unsend the email — it only removes it from the campaign dashboard."
        : "This campaign will be permanently deleted. This cannot be undone.",
      confirmLabel: isSent ? "Remove" : "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setDeletingId(c.id);
        await supabase
          .from("newsletter_campaigns")
          .delete()
          .eq("id", c.id)
          .eq("tenant_id", tenantId);
        setCampaigns((prev) => prev.filter((camp) => camp.id !== c.id));
        setSelectedCampaignId((prev) => (prev === c.id ? null : prev));
        setDeletingId(null);
      },
    });
  }

  function deleteTemplate(tmpl: Template) {
    setConfirmModal({
      title: `Delete "${tmpl.name}"?`,
      message: "This template will be permanently deleted. Any campaigns using it will lose their template reference.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setDeletingId(tmpl.id);
        await supabase
          .from("newsletter_templates")
          .delete()
          .eq("id", tmpl.id)
          .eq("tenant_id", tenantId);
        setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
        setTemplateMetrics((prev) => {
          const next = { ...prev };
          delete next[tmpl.id];
          return next;
        });
        setSelectedTemplateId((prev) => (prev === tmpl.id ? null : prev));
        setDeletingId(null);
      },
    });
  }

  function duplicateCampaign(c: Campaign) {
    setInputModal({
      title: "Duplicate Campaign",
      message: `Choose a name for the copy of "${c.name}".`,
      defaultValue: `${c.name} (Copy)`,
      confirmLabel: "Create Duplicate",
      onConfirm: async (name) => {
        setInputModal(null);
        setDuplicatingId(c.id);
        try {
          const { data, error } = await supabase.from("newsletter_campaigns").insert({
            tenant_id: tenantId,
            name, subject: c.subject, preview_text: c.preview_text, recipients_type: c.recipients_type,
            template_id: c.template_id, status: "draft", blocks: [],
          }).select("id").single();
          if (error || !data) throw error;
          router.push(`/admin/newsletter/campaigns/new?id=${data.id}`);
        } catch { setConfirmModal({ title: "Error", message: "Failed to duplicate campaign.", confirmLabel: "OK", onConfirm: () => setConfirmModal(null) }); }
        finally { setDuplicatingId(null); }
      },
    });
  }

  function duplicateTemplate(tmpl: Template) {
    setInputModal({
      title: "Duplicate Template",
      message: `Choose a name for the copy of "${tmpl.name}".`,
      defaultValue: `${tmpl.name} (Copy)`,
      confirmLabel: "Create Duplicate",
      onConfirm: async (name) => {
        setInputModal(null);
        setDuplicatingId(tmpl.id);
        try {
          const { data, error } = await supabase.from("newsletter_templates").insert({
            tenant_id: tenantId,
            name, blocks: tmpl.blocks,
            settings: (tmpl as unknown as Record<string, unknown>).settings || {},
          }).select("id").single();
          if (error || !data) throw error;
          router.push(`/admin/newsletter/template-editor?id=${data.id}`);
        } catch { setConfirmModal({ title: "Error", message: "Failed to duplicate template.", confirmLabel: "OK", onConfirm: () => setConfirmModal(null) }); }
        finally { setDuplicatingId(null); }
      },
    });
  }

  // ── Filtered lists ───────────────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = !campaignSearch ||
      c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      c.subject.toLowerCase().includes(campaignSearch.toLowerCase());
    const matchesFilter =
      campaignFilter === "all"
        ? true
        : campaignFilter === "draft"
          ? c.status === "draft" || c.status === "scheduled"
          : c.status === "sent";
    return matchesSearch && matchesFilter;
  });

  const selectedCampaign = selectedCampaignId
    ? campaigns.find((c) => c.id === selectedCampaignId) ?? null
    : null;

  const filteredTemplates = templates.filter((t) =>
    !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const draftCount = campaigns.filter((c) => c.status === "draft" || c.status === "scheduled").length;

  const sortedFilteredCampaigns = useMemo(() => {
    const rows = [...filteredCampaigns];
    if (campSortCol && campSortPhase !== 0) {
      const mul = campSortPhase === 1 ? -1 : 1;
      const rank = (s: string) => (s === "sent" ? 2 : s === "scheduled" ? 1 : 0);
      rows.sort((a, b) => {
        if (campSortCol === "name") return mul * a.name.localeCompare(b.name);
        if (campSortCol === "recipients") {
          return mul * ((a.recipient_count || 0) - (b.recipient_count || 0));
        }
        if (campSortCol === "status") return mul * (rank(a.status) - rank(b.status));
        return 0;
      });
    }
    return rows;
  }, [filteredCampaigns, campSortCol, campSortPhase]);

  const sortedFilteredTemplates = useMemo(() => {
    const rows = [...filteredTemplates];
    if (tmplSortCol && tmplSortPhase !== 0) {
      const mul = tmplSortPhase === 1 ? -1 : 1;
      rows.sort((a, b) => {
        const ma = templateMetrics[a.id] ?? {
          recipients: 0,
          sends: 0,
          openPct: null,
          ctrPct: null,
          lastSent: null,
        };
        const mb = templateMetrics[b.id] ?? ma;
        if (tmplSortCol === "name") return mul * a.name.localeCompare(b.name);
        if (tmplSortCol === "updated") {
          return mul * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        }
        if (tmplSortCol === "recipients") return mul * (ma.recipients - mb.recipients);
        if (tmplSortCol === "open") {
          const va = ma.openPct ?? -1;
          const vb = mb.openPct ?? -1;
          return mul * (va - vb);
        }
        if (tmplSortCol === "ctr") {
          const va = ma.ctrPct ?? -1;
          const vb = mb.ctrPct ?? -1;
          return mul * (va - vb);
        }
        if (tmplSortCol === "sends") return mul * (ma.sends - mb.sends);
        return 0;
      });
    }
    return rows;
  }, [filteredTemplates, tmplSortCol, tmplSortPhase, templateMetrics]);

  function campSortHeaderPhase(col: string): SortTriPhase {
    return campSortCol === col ? campSortPhase : 0;
  }
  function onCampaignSortHeader(col: string) {
    const n = cycleSortTriPhase(col, campSortCol, campSortPhase);
    setCampSortCol(n.key);
    setCampSortPhase(n.phase);
  }
  function tmplSortHeaderPhase(col: string): SortTriPhase {
    return tmplSortCol === col ? tmplSortPhase : 0;
  }
  function onTemplateSortHeader(col: string) {
    const n = cycleSortTriPhase(col, tmplSortCol, tmplSortPhase);
    setTmplSortCol(n.key);
    setTmplSortPhase(n.phase);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  const campaignsAdminActionsPanel = (
    <AdminActionsPanel
      attachBelowCreateButton
      sections={[
        {
          title: "Filter",
          customContent: (
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { key: "all" as const, label: "All campaigns" },
                  { key: "draft" as const, label: "Drafts only" },
                  { key: "sent" as const, label: "Sent only" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCampaignFilter(key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                    campaignFilter === key ? navItemActive : navItemInactive
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ),
        },
        ...(selectedCampaign
          ? [
              {
                title: "Campaign",
                items: [
                  ...(selectedCampaign.status === "sent"
                    ? [
                        {
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                          ),
                          label: "View stats",
                          href: `/admin/newsletter/campaign-stats?campaignId=${selectedCampaign.id}`,
                        },
                      ]
                    : []),
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    ),
                    label: selectedCampaign.status === "sent" ? "View" : "Edit",
                    href: `/admin/newsletter/campaigns/new?id=${selectedCampaign.id}`,
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ),
                    label: "Duplicate",
                    onClick: () => duplicateCampaign(selectedCampaign),
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ),
                    label: selectedCampaign.status === "sent" ? "Remove" : "Delete",
                    variant: "danger" as const,
                    onClick: () => deleteCampaign(selectedCampaign),
                  },
                ],
              },
            ]
          : [
              {
                title: "Campaign",
                customContent: (
                  <p className="text-sm text-[var(--admin-text-muted)] px-1">Select a campaign in the table to edit, duplicate, or delete.</p>
                ),
              },
            ]),
        {
          title: "Stats",
          items: [],
          customContent: (
            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--admin-text-muted)]">Sent</span>
                <span className="font-semibold text-[var(--admin-text)]">{sentCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--admin-text-muted)]">Drafts</span>
                <span className="font-semibold text-[var(--admin-text)]">{draftCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--admin-text-muted)]">Templates</span>
                <span className="font-semibold text-[var(--admin-text)]">{templates.length}</span>
              </div>
            </div>
          ),
        },
        ...(transactionalPreviews.length > 0
          ? [
              {
                title: "Newsletter",
                customContent: (
                  <TransactionalEmailTypesList
                    embedded
                    selectedId={transactionalEmailId}
                    onSelect={setTransactionalEmailId}
                    previews={transactionalPreviews}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );

  const selectedTemplate = selectedTemplateId
    ? templates.find((t) => t.id === selectedTemplateId) ?? null
    : null;

  const templatesAdminActionsPanel = (
    <AdminActionsPanel
      attachBelowCreateButton
      sections={[
        ...(selectedTemplate
          ? [
              {
                title: "Template",
                items: [
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    ),
                    label: "Edit",
                    href: `/admin/newsletter/template-editor?id=${selectedTemplate.id}`,
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ),
                    label: duplicatingId === selectedTemplate.id ? "Duplicating…" : "Duplicate",
                    onClick: () => {
                      if (duplicatingId === selectedTemplate.id) return;
                      duplicateTemplate(selectedTemplate);
                    },
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ),
                    label: "Use in new campaign",
                    href: "/admin/newsletter/campaigns/new",
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ),
                    label: deletingId === selectedTemplate.id ? "Deleting…" : "Delete",
                    variant: "danger" as const,
                    onClick: () => {
                      if (deletingId === selectedTemplate.id) return;
                      deleteTemplate(selectedTemplate);
                    },
                  },
                ],
              },
            ]
          : [
              {
                title: "Template",
                customContent: (
                  <p className="px-1 text-sm text-[var(--admin-text-muted)]">
                    Select a template in the table to edit, duplicate, use in a campaign, or delete.
                  </p>
                ),
              },
            ]),
        {
          title: "Stats",
          items: [],
          customContent: (
            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--admin-text-muted)]">Templates</span>
                <span className="font-semibold text-[var(--admin-text)]">{templates.length}</span>
              </div>
            </div>
          ),
        },
      ]}
    />
  );

  const actionsPanel =
    tab === "campaigns"
      ? campaignsAdminActionsPanel
      : tab === "templates"
        ? templatesAdminActionsPanel
        : null;

  return (
    <>
      <AdminPageHeader title="Newsletter" />
      <AdminPageLayout
        createButton={
          tab === "campaigns"
            ? { label: "New Campaign", href: "/admin/newsletter/campaigns/new" }
            : { label: "New Template", href: "/admin/newsletter/template-editor" }
        }
        actionsColumnClassName="xl:pt-28"
        actionsPanel={actionsPanel}
      >
      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
      {inputModal && <InputModal {...inputModal} onCancel={() => setInputModal(null)} />}

      <div className="relative mb-6">
        <button
          type="button"
          onClick={() => setViewDropdownOpen((o) => !o)}
          className="inline-flex items-center gap-2 text-xl font-semibold text-white hover:text-[var(--admin-accent)] transition"
        >
          {tab === "campaigns" ? "Campaigns" : "Templates"}
          <svg
            className={`w-5 h-5 text-[var(--admin-text-muted)] transition-transform ${viewDropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {viewDropdownOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close menu"
              onClick={() => setViewDropdownOpen(false)}
            />
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setTab("campaigns");
                  router.replace("/admin/newsletter?tab=campaigns");
                  setViewDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium ${
                  tab === "campaigns" ? "bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]" : "text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                }`}
              >
                Campaigns
                {tab === "campaigns" && <span className="text-xs">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("templates");
                  router.replace("/admin/newsletter?tab=templates");
                  setViewDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium ${
                  tab === "templates" ? "bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]" : "text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                }`}
              >
                Templates
                {tab === "templates" && <span className="text-xs">✓</span>}
              </button>
            </div>
          </>
        )}
      </div>

      <div>
        {tab === "campaigns" && (
          <div className="flex flex-col gap-12 xl:gap-16">
            <div className="min-w-0 w-full space-y-5">
            <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch">
              <div className="relative min-w-0 flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search campaigns…"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--admin-border)] rounded-lg bg-[var(--admin-card-bg)] text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/30 focus:border-[var(--admin-accent)]"
                />
              </div>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-20 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)]">
                <div className="w-16 h-16 bg-[var(--admin-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-lg font-semibold text-[var(--admin-text)] mb-2">
                  {campaignSearch
                    ? "No matching campaigns"
                    : campaignFilter === "all"
                      ? "No campaigns yet"
                      : campaignFilter === "draft"
                        ? "No draft campaigns"
                        : "No sent campaigns"}
                </p>
                <p className="text-sm text-[var(--admin-text-muted)] mb-6">
                  {campaignSearch
                    ? "Try adjusting your search."
                    : "Create a campaign or change the filter in the sidebar."}
                </p>
                {!campaignSearch && (
                  <Link href="/admin/newsletter/campaigns/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--admin-accent)] text-black font-semibold rounded-lg hover:opacity-90 transition text-sm">
                    New Campaign
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--admin-table-header-bg)] border-b border-[var(--admin-border)]">
                      <AdminTableSortTh
                        label="Campaign"
                        phase={campSortHeaderPhase("name")}
                        onClick={() => onCampaignSortHeader("name")}
                        className="px-5"
                      />
                      <AdminTableSortTh
                        label="Recipients"
                        phase={campSortHeaderPhase("recipients")}
                        onClick={() => onCampaignSortHeader("recipients")}
                        className="px-5"
                      />
                      <AdminTableSortTh
                        label="Status"
                        phase={campSortHeaderPhase("status")}
                        onClick={() => onCampaignSortHeader("status")}
                        className="px-5"
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {sortedFilteredCampaigns.map((c) => {
                      const publishedLine =
                        c.status === "sent" && c.sent_at
                          ? `Published ${new Date(c.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : "Not published yet";
                      return (
                      <tr
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCampaignId(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCampaignId(c.id);
                          }
                        }}
                        className={`cursor-pointer transition ${
                          selectedCampaignId === c.id
                            ? "bg-[var(--admin-accent)]/10"
                            : "hover:bg-[var(--admin-table-row-hover)]"
                        }`}
                      >
                        <td className="px-5 py-4 align-middle">
                          <p className="font-semibold text-sm text-[var(--admin-text)] truncate max-w-md">{c.name}</p>
                          <p className="text-xs text-[var(--admin-text-muted)] mt-1">{publishedLine}</p>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <RecipientsBadge type={c.recipients_type} />
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
            </div>

            <TransactionalEmailsMain
              className="mt-0 w-full min-w-0"
              selectedId={transactionalEmailId}
              onSelectId={setTransactionalEmailId}
              previews={transactionalPreviews}
            />
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Templates</h2>
            <div className="relative mb-5 w-full min-w-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search templates…" value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--admin-border)] rounded-lg bg-[var(--admin-card-bg)] text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/30 focus:border-[var(--admin-accent)]" />
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-20 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)]">
                <div className="w-16 h-16 bg-[var(--admin-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-lg font-semibold text-[var(--admin-text)] mb-2">
                  {templateSearch ? "No matching templates" : "No templates yet"}
                </p>
                <p className="text-sm text-[var(--admin-text-muted)] mb-6">
                  {templateSearch ? "Try a different search term." : "Create a reusable email layout to use across campaigns."}
                </p>
                {!templateSearch && (
                  <Link href="/admin/newsletter/template-editor"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--admin-accent)] text-black font-semibold rounded-lg hover:opacity-90 transition text-sm">
                    Create a Template
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="bg-[var(--admin-table-header-bg)] border-b border-[var(--admin-border)]">
                        <AdminTableSortTh
                          label="Template"
                          phase={tmplSortHeaderPhase("name")}
                          onClick={() => onTemplateSortHeader("name")}
                          className="px-5"
                        />
                        <AdminTableSortTh
                          label="Recipients"
                          phase={tmplSortHeaderPhase("recipients")}
                          onClick={() => onTemplateSortHeader("recipients")}
                          className="px-5"
                        />
                        <AdminTableSortTh
                          label="Open rate"
                          phase={tmplSortHeaderPhase("open")}
                          onClick={() => onTemplateSortHeader("open")}
                          className="px-5"
                        />
                        <AdminTableSortTh
                          label="CTR"
                          phase={tmplSortHeaderPhase("ctr")}
                          onClick={() => onTemplateSortHeader("ctr")}
                          className="px-5"
                        />
                        <AdminTableSortTh
                          label="Sends"
                          phase={tmplSortHeaderPhase("sends")}
                          onClick={() => onTemplateSortHeader("sends")}
                          className="px-5"
                        />
                        <AdminTableSortTh
                          label="Updated"
                          phase={tmplSortHeaderPhase("updated")}
                          onClick={() => onTemplateSortHeader("updated")}
                          className="px-5"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--admin-border)]">
                      {sortedFilteredTemplates.map((tmpl) => {
                        const m = templateMetrics[tmpl.id];
                        const usedCount = campaigns.filter((c) => c.template_id === tmpl.id).length;
                        return (
                          <tr
                            key={tmpl.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedTemplateId(tmpl.id);
                              }
                            }}
                            className={`cursor-pointer transition ${
                              selectedTemplateId === tmpl.id
                                ? "bg-[var(--admin-accent)]/10"
                                : "hover:bg-[var(--admin-table-row-hover)]"
                            }`}
                          >
                            <td className="px-5 py-4 align-top">
                              <p className="font-semibold text-sm text-[var(--admin-text)] truncate max-w-[14rem]">{tmpl.name}</p>
                              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                                {tmpl.blocks.length} block{tmpl.blocks.length !== 1 ? "s" : ""}
                                {usedCount > 0 ? ` · ${usedCount} campaign${usedCount !== 1 ? "s" : ""}` : " · Not used in campaigns"}
                              </p>
                            </td>
                            <td className="px-5 py-4 align-middle text-sm tabular-nums text-[var(--admin-text)]">
                              {(m?.recipients ?? 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-4 align-middle text-sm tabular-nums text-[var(--admin-text)]">
                              {m?.openPct != null ? `${m.openPct.toFixed(1)}%` : "—"}
                            </td>
                            <td className="px-5 py-4 align-middle text-sm tabular-nums text-[var(--admin-text)]">
                              {m?.ctrPct != null ? `${m.ctrPct.toFixed(1)}%` : "—"}
                            </td>
                            <td className="px-5 py-4 align-middle text-sm tabular-nums text-[var(--admin-text)]">
                              {m?.sends ?? 0}
                            </td>
                            <td className="px-5 py-4 align-middle text-xs text-[var(--admin-text-muted)] whitespace-nowrap">
                              {new Date(tmpl.updated_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </AdminPageLayout>
    </>
  );
}

export default function NewsletterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
        </div>
      }
    >
      <NewsletterInner />
    </Suspense>
  );
}
