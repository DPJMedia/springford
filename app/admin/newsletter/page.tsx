"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "sent";
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

type CampaignFilter = "all" | "draft" | "sent";

// ─── Shared Modal Components ──────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-[color:var(--color-dark)] mb-2">{title}</h2>
          <p className="text-sm text-[color:var(--color-medium)]">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${
              danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-[color:var(--color-riviera-blue)] text-white hover:opacity-90"
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-[color:var(--color-dark)] mb-1">{title}</h2>
          <p className="text-sm text-[color:var(--color-medium)] mb-4">{message}</p>
          <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
            onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onConfirm(value.trim()); if (e.key === "Escape") onCancel(); }} />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} disabled={!value.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[color:var(--color-riviera-blue)] text-white rounded-xl hover:opacity-90 transition disabled:opacity-40">
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Sent</span>;
  if (status === "scheduled") return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Scheduled</span>;
  return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Draft</span>;
}

function RecipientsBadge({ type }: { type: string }) {
  if (type === "all_users") return <span className="text-xs text-gray-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>All Users</span>;
  return <span className="text-xs text-gray-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Subscribers</span>;
}

// ─── Main Inner ───────────────────────────────────────────────────────────────

function NewsletterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "campaigns" | "templates") || "campaigns";

  const [tab, setTab] = useState<"campaigns" | "templates">(initialTab);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void } | null>(null);
  const [inputModal, setInputModal] = useState<{ title: string; message: string; defaultValue?: string; confirmLabel?: string; onConfirm: (v: string) => void } | null>(null);

  // Filters
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>("all");
  const [templateSearch, setTemplateSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("user_profiles").select("is_admin,is_super_admin").eq("id", user.id).single();
      if (!p?.is_admin && !p?.is_super_admin) { router.push("/admin"); return; }
      await loadData();
    }
    init();
  }, [router, supabase]);

  async function loadData() {
    setLoading(true);
    const [{ data: tmplData }, { data: campData }] = await Promise.all([
      supabase.from("newsletter_templates").select("*").order("updated_at", { ascending: false }),
      supabase.from("newsletter_campaigns").select("*").order("updated_at", { ascending: false }),
    ]);
    const tmplList: Template[] = tmplData || [];
    setTemplates(tmplList);
    // Attach template name to campaigns
    const campList: Campaign[] = (campData || []).map((c) => ({
      ...c,
      template_name: tmplList.find((t) => t.id === c.template_id)?.name || null,
    }));
    setCampaigns(campList);
    setLoading(false);
  }

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
        await supabase.from("newsletter_campaigns").delete().eq("id", c.id);
        setCampaigns((prev) => prev.filter((camp) => camp.id !== c.id));
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
        await supabase.from("newsletter_templates").delete().eq("id", tmpl.id);
        setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
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
    const matchesFilter = campaignFilter === "all" || c.status === campaignFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredTemplates = templates.filter((t) =>
    !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const draftCount = campaigns.filter((c) => c.status === "draft").length;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
      {inputModal && <InputModal {...inputModal} onCancel={() => setInputModal(null)} />}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/admin" className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition">← Dashboard</Link>
              </div>
              <h1 className="text-2xl font-bold text-[color:var(--color-dark)]">Newsletter</h1>
              <p className="text-sm text-[color:var(--color-medium)] mt-0.5">
                {sentCount} sent · {draftCount} draft · {templates.length} template{templates.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/newsletter/template-editor"
                className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-[color:var(--color-riviera-blue)] bg-blue-50 hover:bg-blue-100 rounded-xl font-semibold text-sm transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                New Template
              </Link>
              <Link href="/admin/newsletter/campaigns/new"
                className="flex items-center gap-2 px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                New Campaign
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-6 border-b border-gray-200 -mb-px">
            {(["campaigns", "templates"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition capitalize ${
                  tab === t
                    ? "border-[color:var(--color-riviera-blue)] text-[color:var(--color-riviera-blue)]"
                    : "border-transparent text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
                }`}>
                {t}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === t ? "bg-blue-100 text-[color:var(--color-riviera-blue)]" : "bg-gray-100 text-gray-500"}`}>
                  {t === "campaigns" ? campaigns.length : templates.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* ── CAMPAIGNS TAB ── */}
        {tab === "campaigns" && (
          <div>
            {/* Search + Filter bar */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="relative flex-1 min-w-0 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search campaigns…" value={campaignSearch} onChange={(e) => setCampaignSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)] bg-white" />
              </div>
              <div className="flex gap-1">
                {(["all", "draft", "sent"] as CampaignFilter[]).map((f) => (
                  <button key={f} onClick={() => setCampaignFilter(f)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize transition ${
                      campaignFilter === f
                        ? "bg-[color:var(--color-riviera-blue)] text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>{f}</button>
                ))}
              </div>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-lg font-semibold text-[color:var(--color-dark)] mb-2">
                  {campaignSearch || campaignFilter !== "all" ? "No matching campaigns" : "No campaigns yet"}
                </p>
                <p className="text-sm text-[color:var(--color-medium)] mb-6">
                  {campaignSearch || campaignFilter !== "all" ? "Try adjusting your search or filter." : "Create your first campaign to start sending newsletters."}
                </p>
                {!campaignSearch && campaignFilter === "all" && (
                  <Link href="/admin/newsletter/campaigns/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-riviera-blue)] text-white font-semibold rounded-lg hover:opacity-90 transition text-sm">
                    New Campaign
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Template</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Recipients</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCampaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-sm text-[color:var(--color-dark)] truncate max-w-[200px]">{c.name}</p>
                          {c.subject && <p className="text-xs text-[color:var(--color-medium)] truncate max-w-[200px] mt-0.5">{c.subject}</p>}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          {c.template_name
                            ? <span className="text-xs font-medium text-[color:var(--color-riviera-blue)] bg-blue-50 px-2 py-0.5 rounded-full">{c.template_name}</span>
                            : <span className="text-xs text-gray-400 italic">No template</span>}
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell"><RecipientsBadge type={c.recipients_type} /></td>
                        <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                        <td className="px-5 py-4 hidden lg:table-cell text-xs text-gray-400">
                          {c.status === "sent" && c.sent_at
                            ? new Date(c.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : `Updated ${new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/newsletter/campaigns/new?id=${c.id}`}
                              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition">
                              {c.status === "sent" ? "View" : "Edit"}
                            </Link>
                            <button onClick={() => duplicateCampaign(c)} disabled={duplicatingId === c.id}
                              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition disabled:opacity-50">
                              {duplicatingId === c.id ? "…" : "Duplicate"}
                            </button>
                            <button onClick={() => deleteCampaign(c)} disabled={deletingId === c.id}
                              title={c.status === "sent" ? "Remove from list (does not unsend)" : "Delete draft"}
                              className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                              {deletingId === c.id ? "…" : c.status === "sent" ? "Remove" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 min-w-0 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search templates…" value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)] bg-white" />
              </div>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-lg font-semibold text-[color:var(--color-dark)] mb-2">
                  {templateSearch ? "No matching templates" : "No templates yet"}
                </p>
                <p className="text-sm text-[color:var(--color-medium)] mb-6">
                  {templateSearch ? "Try a different search term." : "Create a reusable email layout to use across campaigns."}
                </p>
                {!templateSearch && (
                  <Link href="/admin/newsletter/template-editor"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-riviera-blue)] text-white font-semibold rounded-lg hover:opacity-90 transition text-sm">
                    Create a Template
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {filteredTemplates.map((tmpl, i) => {
                  const usedInCampaigns = campaigns.filter((c) => c.template_id === tmpl.id);
                  const isExpanded = expandedTemplateId === tmpl.id;
                  return (
                    <div key={tmpl.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                      {/* Main row */}
                      <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition">
                        {/* Icon */}
                        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        {/* Name + meta */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[color:var(--color-dark)] truncate">{tmpl.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {tmpl.blocks.length} block{tmpl.blocks.length !== 1 ? "s" : ""} · Updated {new Date(tmpl.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        {/* Campaign usage toggle */}
                        <button onClick={() => setExpandedTemplateId(isExpanded ? null : tmpl.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition flex-shrink-0 ${
                            usedInCampaigns.length > 0
                              ? "border-blue-200 text-[color:var(--color-riviera-blue)] bg-blue-50 hover:bg-blue-100"
                              : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500"
                          }`}>
                          {usedInCampaigns.length > 0
                            ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{usedInCampaigns.length} campaign{usedInCampaigns.length > 1 ? "s" : ""}</>
                            : "Not used"}
                          <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link href={`/admin/newsletter/template-editor?id=${tmpl.id}`}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-[color:var(--color-riviera-blue)] hover:bg-blue-100 rounded-lg transition">
                            Edit
                          </Link>
                          <button onClick={() => duplicateTemplate(tmpl)} disabled={duplicatingId === tmpl.id}
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition disabled:opacity-50">
                            {duplicatingId === tmpl.id ? "…" : "Duplicate"}
                          </button>
                          <Link href="/admin/newsletter/campaigns/new"
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-[color:var(--color-riviera-blue)] hover:bg-blue-100 rounded-lg transition">
                            Use
                          </Link>
                          <button onClick={() => deleteTemplate(tmpl)} disabled={deletingId === tmpl.id}
                            className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                            Delete
                          </button>
                        </div>
                      </div>
                      {/* Expandable campaign list */}
                      {isExpanded && (
                        <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3 mb-2">Used in these campaigns</p>
                          {usedInCampaigns.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No campaigns use this template yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {usedInCampaigns.map((c) => (
                                <Link key={c.id} href={`/admin/newsletter/campaigns/new?id=${c.id}`}
                                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition group">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[color:var(--color-dark)] truncate group-hover:text-[color:var(--color-riviera-blue)] transition">{c.name}</p>
                                    {c.subject && <p className="text-xs text-gray-400 truncate">{c.subject}</p>}
                                  </div>
                                  <StatusBadge status={c.status} />
                                  <svg className="w-4 h-4 text-gray-300 group-hover:text-[color:var(--color-riviera-blue)] flex-shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsletterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" /></div>}>
      <NewsletterInner />
    </Suspense>
  );
}
