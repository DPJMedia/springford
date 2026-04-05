"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buildEmailHtml } from "@/lib/newsletter/buildEmailHtml";
import type { NewsletterBlock, ArticleLayout } from "@/lib/newsletter/buildEmailHtml";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  blocks: NewsletterBlock[];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type RecipientsType = "newsletter" | "all_users" | "super_admins";

const RECIPIENTS_OPTIONS: { value: RecipientsType; label: string; desc: string }[] = [
  { value: "newsletter",   label: "Newsletter Subscribers", desc: "Only users who have opted in to the newsletter" },
  { value: "all_users",    label: "All Registered Users",   desc: "Every user with an account on the site" },
  { value: "super_admins", label: "Super Admins Only",      desc: "Only super admin accounts — useful for internal review before a full send" },
];

// ─── Confirm Modal (replaces browser confirm()) ───────────────────────────────

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-[var(--admin-border)]">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
          <p className="text-sm text-[var(--admin-text-muted)]">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-lg hover:bg-[var(--admin-table-header-bg)] transition">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[var(--admin-accent)] text-black hover:opacity-90"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Name Prompt ─────────────────────────────────────────────────────

function CampaignNameModal({ onConfirm, onCancel }: { onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-xl w-full max-w-sm overflow-hidden border border-[var(--admin-border)]">
        <div className="px-6 py-5 border-b border-[var(--admin-border)]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[var(--admin-accent)]/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <span className="text-xs font-semibold text-[var(--admin-accent)] uppercase tracking-wide">New Campaign</span>
            </div>
            <button onClick={onCancel} className="w-7 h-7 rounded-full hover:bg-[var(--admin-table-header-bg)] flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition text-lg leading-none">✕</button>
          </div>
          <h2 className="text-lg font-semibold text-white">Name your campaign</h2>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">Give this campaign an internal name to identify it later.</p>
        </div>
        <div className="px-6 py-5">
          <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. March Weekly Briefing"
            className="w-full px-3 py-2.5 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); if (e.key === "Escape") onCancel(); }} />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-lg hover:bg-[var(--admin-table-header-bg)] transition">
            Cancel
          </button>
          <button onClick={() => name.trim() && onConfirm(name.trim())} disabled={!name.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[var(--admin-accent)] text-black rounded-lg hover:opacity-90 transition disabled:opacity-40">
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({ recipientsType, onSchedule, onClose }: {
  recipientsType: RecipientsType; onSchedule: (isoUtc: string) => void; onClose: () => void;
}) {
  // Default to 5 minutes from now in ET
  function getDefaultET() {
    const soon = new Date(Date.now() + 5 * 60 * 1000);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(soon);
    const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  }

  const defaults = getDefaultET();
  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [pastError, setPastError] = useState(false);

  // Convert entered ET date+time to UTC ISO (DST-safe)
  function etToUtcIso(d: string, t: string): string {
    const estDate = new Date(`${d}T${t}:00-05:00`);
    const etParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour: "2-digit", hour12: false,
    }).formatToParts(estDate);
    const etHour = parseInt(etParts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const inputHour = parseInt(t.split(":")[0], 10);
    return etHour === inputHour
      ? estDate.toISOString()
      : new Date(`${d}T${t}:00-04:00`).toISOString();
  }

  function getLabel() {
    try {
      const iso = etToUtcIso(date, time);
      return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric",
        year: "numeric", hour: "numeric", minute: "2-digit",
      }) + " ET";
    } catch { return ""; }
  }

  function isInPast(): boolean {
    try { return new Date(etToUtcIso(date, time)) <= new Date(); }
    catch { return false; }
  }

  function handleSchedule() {
    if (isInPast()) { setPastError(true); return; }
    try {
      onSchedule(etToUtcIso(date, time));
    } catch {
      onSchedule(new Date(`${date}T${time}:00`).toISOString());
    }
  }

  function handleDateChange(v: string) { setDate(v); setPastError(false); }
  function handleTimeChange(v: string) { setTime(v); setPastError(false); }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-[var(--admin-border)]">
        <div className="px-6 py-5 border-b border-[var(--admin-border)]">
          <h2 className="text-lg font-semibold text-white">Schedule Campaign</h2>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">Set a future date and time to automatically send.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div><label className="block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-1.5">Date</label><input type="date" value={date} min={today} onChange={(e) => handleDateChange(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]" /></div>
          <div><label className="block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-1.5">Time <span className="font-normal normal-case text-[var(--admin-text-muted)]">(Eastern Time)</span></label><input type="time" value={time} onChange={(e) => handleTimeChange(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]" /></div>
          {pastError && (
            <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800/50 rounded-lg">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              <p className="text-xs font-semibold text-red-400">That time is in the past. Please pick a future time.</p>
            </div>
          )}
          {date && time && !pastError && <div className="p-3 bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/30 rounded-lg"><p className="text-xs text-[var(--admin-accent)] font-semibold">Will send to {RECIPIENTS_OPTIONS.find((o) => o.value === recipientsType)?.label}</p><p className="text-sm font-semibold text-white mt-0.5">{getLabel()}</p></div>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-lg hover:bg-[var(--admin-table-header-bg)] transition">Cancel</button>
          <button onClick={handleSchedule} disabled={!date || !time || isInPast()} className="flex-1 py-2.5 text-sm font-semibold bg-[var(--admin-accent)] text-black rounded-lg hover:opacity-90 transition disabled:opacity-40">Schedule</button>
        </div>
      </div>
    </div>
  );
}

// ─── Template Use/Duplicate Modal ─────────────────────────────────────────────

function TemplatePicker({
  template, onUseAsIs, onDuplicate, onClose,
}: {
  template: Template;
  onUseAsIs: () => void;
  onDuplicate: (name: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"use" | "duplicate">("use");
  const [dupName, setDupName] = useState(`${template.name} (Copy)`);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (mode === "duplicate") setTimeout(() => inputRef.current?.focus(), 100); }, [mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-[var(--admin-border)]">
        <div className="px-6 py-5 border-b border-[var(--admin-border)]">
          <h2 className="text-lg font-semibold text-white">Select Template</h2>
          <p className="text-sm text-[var(--admin-accent)] font-medium mt-0.5">{template.name}</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <button onClick={() => setMode("use")}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition ${mode === "use" ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10" : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50"}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${mode === "use" ? "border-[var(--admin-accent)]" : "border-[var(--admin-border)]"}`}>
              {mode === "use" && <div className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${mode === "use" ? "text-[var(--admin-accent)]" : "text-[var(--admin-text)]"}`}>Use as-is</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">This campaign uses the template directly. Changes to the template will affect this campaign preview.</p>
            </div>
          </button>
          <button onClick={() => setMode("duplicate")}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition ${mode === "duplicate" ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10" : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50"}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${mode === "duplicate" ? "border-[var(--admin-accent)]" : "border-[var(--admin-border)]"}`}>
              {mode === "duplicate" && <div className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${mode === "duplicate" ? "text-[var(--admin-accent)]" : "text-[var(--admin-text)]"}`}>Duplicate & customize</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">Creates an independent copy you can edit freely.</p>
              {mode === "duplicate" && (
                <input ref={inputRef} type="text" value={dupName} onChange={(e) => setDupName(e.target.value)}
                  placeholder="Name for the duplicate"
                  className="mt-2 w-full px-3 py-2 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === "Enter" && dupName.trim()) { e.preventDefault(); onDuplicate(dupName.trim()); } }} />
              )}
            </div>
          </button>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-lg hover:bg-[var(--admin-table-header-bg)] transition">Cancel</button>
          <button
            onClick={() => mode === "use" ? onUseAsIs() : (dupName.trim() && onDuplicate(dupName.trim()))}
            disabled={mode === "duplicate" && !dupName.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[var(--admin-accent)] text-black rounded-lg hover:opacity-90 transition disabled:opacity-40">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function CampaignNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [campaignName, setCampaignName] = useState("Weekly Newsletter");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [recipientsType, setRecipientsType] = useState<RecipientsType>("newsletter");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [articleLayout, setArticleLayout] = useState<ArticleLayout>("stack");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const [sendResult, setSendResult] = useState<{ success?: boolean; error?: string; sentTo?: string } | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [templatePickModal, setTemplatePickModal] = useState<Template | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [showCampaignNameModal, setShowCampaignNameModal] = useState(!editId);
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);

  const currentCampaignId = useRef<string | null>(editId);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("user_profiles").select("is_admin,is_super_admin").eq("id", user.id).single();
      if (!p?.is_admin && !p?.is_super_admin) { router.push("/admin/articles"); return; }

      const { data: tmplData } = await supabase.from("newsletter_templates").select("*").order("updated_at", { ascending: false });
      const tmplList: Template[] = (tmplData || []).map((t) => ({ ...t, settings: (t.settings as Record<string, unknown>) || {} }));
      setTemplates(tmplList);
      setLoadingTemplates(false);

      if (editId) {
        const { data: c } = await supabase.from("newsletter_campaigns").select("*").eq("id", editId).single();
        if (c) {
          setCampaignName(c.name);
          setSubject(c.subject || "");
          setPreviewText(c.preview_text || "");
          setRecipientsType((c.recipients_type as RecipientsType) || "newsletter");
          setIsSent(c.status === "sent");
          setIsScheduled(c.status === "scheduled");
          setScheduledAt(c.scheduled_at || null);
          if (c.template_id) {
            const tmpl = tmplList.find((t) => t.id === c.template_id);
            if (tmpl) {
              setSelectedTemplate(tmpl);
              // Layout comes from template settings
              const layout = (tmpl.settings?.articleLayout as ArticleLayout) || "stack";
              setArticleLayout(layout);
            }
          }
        }
        setLoadingCampaign(false);
      }
    }
    init();
  }, [editId, router, supabase]);

  // ── Campaign name prompt ──────────────────────────────────────────────────────

  function handleCampaignNameConfirm(name: string) {
    setCampaignName(name);
    setShowCampaignNameModal(false);
  }

  function handleCampaignNameCancel() {
    router.push("/admin/newsletter");
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function saveNow(
    name: string, subj: string, pvText: string, rt: RecipientsType,
    tmplId: string | null, schedAt: string | null, newStatus?: "draft" | "scheduled",
  ): Promise<string | null> {
    setSaving(true); setSaveStatus("");
    const status = newStatus ?? (schedAt ? "scheduled" : "draft");
    try {
      if (currentCampaignId.current) {
        const { error } = await supabase.from("newsletter_campaigns").update({
          name, subject: subj, preview_text: pvText, recipients_type: rt,
          template_id: tmplId, scheduled_at: schedAt, status,
          updated_at: new Date().toISOString(),
        }).eq("id", currentCampaignId.current);
        if (error) throw error;
        setSaveStatus("saved"); return currentCampaignId.current;
      } else {
        const { data, error } = await supabase.from("newsletter_campaigns").insert({
          name, subject: subj, preview_text: pvText, recipients_type: rt,
          template_id: tmplId, scheduled_at: schedAt, status: "draft",
          blocks: selectedTemplate?.blocks || [],
        }).select("id").single();
        if (error || !data) throw error;
        currentCampaignId.current = data.id;
        router.replace(`/admin/newsletter/campaigns/new?id=${data.id}`, { scroll: false });
        setSaveStatus("saved"); return data.id;
      }
    } catch { setSaveStatus("error"); return null; }
    finally { setSaving(false); }
  }

  function scheduleSave(name: string, subj: string, pvText: string, rt: RecipientsType, tmplId: string | null, schedAt: string | null) {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveNow(name, subj, pvText, rt, tmplId, schedAt), 1500);
  }

  function updateField(fields: Partial<{ name: string; subject: string; previewText: string; recipientsType: RecipientsType }>) {
    const n = fields.name ?? campaignName;
    const s = fields.subject ?? subject;
    const pt = fields.previewText ?? previewText;
    const rt = fields.recipientsType ?? recipientsType;
    if ("name" in fields) setCampaignName(n);
    if ("subject" in fields) setSubject(s);
    if ("previewText" in fields) setPreviewText(pt);
    if ("recipientsType" in fields) setRecipientsType(rt);
    scheduleSave(n, s, pt, rt, selectedTemplate?.id ?? null, scheduledAt);
  }

  function applyTemplate(tmpl: Template) {
    setSelectedTemplate(tmpl);
    const layout = (tmpl.settings?.articleLayout as ArticleLayout) || "stack";
    setArticleLayout(layout);
    scheduleSave(campaignName, subject, previewText, recipientsType, tmpl.id, scheduledAt);
  }

  async function handleDuplicate(tmpl: Template, dupName: string) {
    setDuplicating(true);
    try {
      const { data, error } = await supabase.from("newsletter_templates").insert({
        name: dupName, blocks: tmpl.blocks, settings: tmpl.settings,
      }).select("*").single();
      if (error || !data) throw error;
      const newTmpl: Template = { ...data, settings: (data.settings as Record<string, unknown>) || {} };
      setTemplates((prev) => [newTmpl, ...prev]);
      setTemplatePickModal(null);
      applyTemplate(newTmpl);
    } catch { setSendResult({ error: "Failed to duplicate template. Please try again." }); }
    finally { setDuplicating(false); }
  }

  // ── Navigate to template editor ───────────────────────────────────────────────

  async function goToEditTemplate() {
    if (!selectedTemplate) return;
    const id = await saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate.id, scheduledAt);
    if (!id) return;
    const returnTo = encodeURIComponent(`/admin/newsletter/campaigns/new?id=${id}`);
    router.push(`/admin/newsletter/template-editor?id=${selectedTemplate.id}&returnTo=${returnTo}`);
  }

  async function goToCreateTemplate() {
    const id = await saveNow(campaignName, subject, previewText, recipientsType, null, scheduledAt);
    const returnTo = id
      ? encodeURIComponent(`/admin/newsletter/campaigns/new?id=${id}`)
      : encodeURIComponent(`/admin/newsletter/campaigns/new`);
    router.push(`/admin/newsletter/template-editor?returnTo=${returnTo}`);
  }

  // ── Schedule / Send ───────────────────────────────────────────────────────────

  // "Schedule" in the modal just stores the intended time — status stays "draft"
  // so the cron ignores it until the user explicitly confirms via "Confirm Schedule".
  async function handleSchedule(isoUtc: string) {
    setScheduledAt(isoUtc);
    setShowScheduleModal(false);
    await saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate?.id ?? null, isoUtc, "draft");
  }

  function clearSchedule() {
    setScheduledAt(null);
    saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate?.id ?? null, null, "draft");
  }

  // Commits the scheduled send — sets status to "scheduled" so the cron picks it up.
  async function executeSchedule() {
    if (!selectedTemplate || !scheduledAt) return;
    setSending(true); setSendResult(null);
    const id = await saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate.id, scheduledAt, "scheduled");
    if (!id) { setSending(false); return; }
    await supabase.from("newsletter_campaigns").update({ blocks: selectedTemplate.blocks }).eq("id", id);
    setSending(false);
    setIsScheduled(true);
    setSendResult({ success: true, sentTo: `scheduled for ${formatScheduledAt(scheduledAt)}` });
    setTimeout(() => router.push("/admin/newsletter"), 2500);
  }

  async function executeSend(testOnly: boolean) {
    if (!selectedTemplate) return;
    const id = await saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate.id, scheduledAt);
    if (!id) return;
    await supabase.from("newsletter_campaigns").update({ blocks: selectedTemplate.blocks }).eq("id", id);

    setSending(true); setSendResult(null);
    try {
      const res = await fetch("/api/newsletter/send-campaign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id, testOnly }),
      });
      const data = await res.json();
      setSendResult(data);
      if (data.success && !testOnly) {
        setIsSent(true);
        setTimeout(() => router.push("/admin/newsletter"), 2500);
      }
    } catch { setSendResult({ error: "Network error." }); }
    finally { setSending(false); }
  }

  function handleSend(testOnly: boolean) {
    if (!selectedTemplate) { setSendResult({ error: "Please select a template first." }); return; }
    if (!subject.trim()) { setSendResult({ error: "Please enter a subject line before sending." }); return; }
    const recipLabel = RECIPIENTS_OPTIONS.find((o) => o.value === recipientsType)?.label;

    if (testOnly) {
      setConfirmModal({
        title: "Send test email?",
        message: "A preview will be sent to dylancobb2525@gmail.com only. The campaign will not be marked as sent.",
        confirmLabel: "Send Test",
        onConfirm: () => { setConfirmModal(null); executeSend(true); },
      });
      return;
    }

    // If a future scheduled time is set, confirm the schedule (not an immediate send)
    const isFutureSchedule = scheduledAt && new Date(scheduledAt) > new Date();
    if (isFutureSchedule) {
      setConfirmModal({
        title: "Confirm scheduled send?",
        message: `This campaign will be sent to ${recipLabel} at ${formatScheduledAt(scheduledAt!)}. You can still cancel by coming back to this page before that time.`,
        confirmLabel: "Confirm Schedule",
        onConfirm: () => { setConfirmModal(null); executeSchedule(); },
      });
    } else {
      setConfirmModal({
        title: "Send campaign now?",
        message: `This will send to all ${recipLabel} immediately. This cannot be undone.`,
        confirmLabel: "Send Campaign",
        onConfirm: () => { setConfirmModal(null); executeSend(false); },
      });
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const previewHtml = selectedTemplate
    ? buildEmailHtml(selectedTemplate.blocks, subject || selectedTemplate.name, previewText, undefined, articleLayout)
    : "";

  function formatScheduledAt(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      }) + " ET";
    } catch { return iso; }
  }

  if (loadingCampaign) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title="Campaign Editor" />
      {/* Campaign name prompt — shown immediately for new campaigns */}
      {showCampaignNameModal && <CampaignNameModal onConfirm={handleCampaignNameConfirm} onCancel={handleCampaignNameCancel} />}

      {/* TOP BAR */}
      <div className="bg-[var(--admin-card-bg)] border-b border-[var(--admin-border)] px-4 py-3 flex items-center gap-3 flex-wrap rounded-lg mb-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-[var(--admin-accent)]/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <span className="text-xs font-semibold text-[var(--admin-accent)] uppercase tracking-wide">Campaign</span>
        </div>
        <input type="text" value={campaignName} disabled={isSent || isScheduled}
          onChange={(e) => updateField({ name: e.target.value })}
          className="text-base font-semibold text-[var(--admin-text)] bg-transparent border-0 focus:outline-none focus:ring-0 flex-1 min-w-0" />
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveStatus === "saved" && <span className="text-xs text-green-400 font-medium">✓ Saved</span>}
          {saveStatus === "error" && <span className="text-xs text-red-400 font-medium">Save failed</span>}
          {isSent && <span className="text-xs bg-green-900/40 border border-green-700/40 text-green-400 px-2 py-0.5 rounded-full font-semibold">Sent</span>}
          {isScheduled && <span className="text-xs bg-amber-900/40 border border-amber-700/40 text-amber-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Scheduled</span>}
          {!isSent && !isScheduled && <button onClick={() => handleSend(true)} disabled={sending || !selectedTemplate} className="px-3 py-1.5 text-xs font-semibold text-[var(--admin-accent)] border border-[var(--admin-accent)] rounded-lg hover:bg-[var(--admin-accent)]/10 transition disabled:opacity-40">Send Test</button>}
        </div>
      </div>


      {/* Send result */}
      {sendResult && (
        <div className={`px-4 py-3 flex items-center gap-3 rounded-lg mb-4 border ${sendResult.success ? "bg-green-900/20 border-green-700/40" : "bg-red-900/20 border-red-700/40"}`}>
          {sendResult.success
            ? <><svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><p className="text-sm text-green-400">Sent to <strong>{sendResult.sentTo}</strong> — check your inbox!</p></>
            : <><svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg><p className="text-sm text-red-400">{sendResult.error || "Send failed."}</p></>}
          <button onClick={() => setSendResult(null)} className="ml-auto text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] text-lg leading-none">✕</button>
        </div>
      )}

      {/* SPLIT SCREEN */}
      <div className="flex gap-4">

        {/* LEFT: Email preview / template picker */}
        <div className="flex-1 overflow-y-auto bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)] rounded-lg p-1">
          {!selectedTemplate ? (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Select a Template</h2>
                  <p className="text-sm text-[var(--admin-text-muted)]">Choose the email layout for this campaign.</p>
                </div>
                <button onClick={goToCreateTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-accent)] text-white font-semibold rounded-xl text-sm hover:opacity-90 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create New Template
                </button>
              </div>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-r-transparent" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-20 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)]">
                  <div className="w-16 h-16 bg-[var(--admin-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                  <p className="text-lg font-semibold text-white mb-2">No templates yet</p>
                  <p className="text-sm text-[var(--admin-text-muted)] mb-6">Create a template before sending a campaign.</p>
                  <button onClick={goToCreateTemplate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--admin-accent)] text-white font-semibold rounded-lg hover:opacity-90 transition text-sm">Create a Template</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map((tmpl) => (
                    <button key={tmpl.id} onClick={() => setTemplatePickModal(tmpl)}
                      className="text-left bg-[var(--admin-card-bg)] rounded-lg border-2 border-[var(--admin-border)] hover:border-[var(--admin-accent)] hover:shadow-md transition p-5 group">
                      <div className="w-full h-32 bg-[var(--admin-table-header-bg)] rounded-lg border border-[var(--admin-border)] mb-4 overflow-hidden relative">
                        <iframe srcDoc={buildEmailHtml(tmpl.blocks, tmpl.name)} title={tmpl.name}
                          className="w-full h-full pointer-events-none"
                          style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", height: "222%" }}
                          sandbox="allow-same-origin" />
                        <div className="absolute inset-0 group-hover:bg-[#2b8aa8]/5 transition rounded-lg" />
                      </div>
                      <p className="font-semibold text-[var(--admin-text)] text-sm group-hover:text-[var(--admin-accent)] transition">{tmpl.name}</p>
                      <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                        {tmpl.blocks.length} block{tmpl.blocks.length !== 1 ? "s" : ""} · {(tmpl.settings?.articleLayout as string || "stack")} layout
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setSelectedTemplate(null)} className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition flex items-center gap-1 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Change
                  </button>
                  <span className="text-[var(--admin-border)] flex-shrink-0">|</span>
                  <span className="text-xs font-semibold text-[var(--admin-text-muted)] truncate">Using: <span className="text-[var(--admin-accent)]">{selectedTemplate.name}</span></span>
                </div>
                {!isSent && !isScheduled && (
                  <button onClick={goToEditTemplate}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--admin-accent)] text-white font-semibold text-xs rounded-lg hover:opacity-90 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit Template
                  </button>
                )}
              </div>
              <div className="flex-1 bg-white rounded-lg border border-[var(--admin-border)] overflow-hidden">
                <iframe srcDoc={previewHtml} title="Email preview" className="w-full h-full" sandbox="allow-same-origin" />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Settings panel */}
        <div className="w-80 flex-shrink-0 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-lg overflow-y-auto flex flex-col">
          <div className="flex-1 p-5 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white mb-0.5">Campaign Settings</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Configure how and to whom this email will be sent.</p>
            </div>

            {/* Template indicator */}
            <div>
              <label className="block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-2">Template</label>
              {selectedTemplate ? (
                <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/30 rounded-lg">
                  <div className="w-8 h-8 bg-[var(--admin-accent)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[var(--admin-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--admin-text)] truncate">{selectedTemplate.name}</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">{selectedTemplate.blocks.length} blocks · {articleLayout} layout</p>
                  </div>
                  <button onClick={() => setSelectedTemplate(null)} className="text-xs text-[var(--admin-accent)] hover:opacity-70 transition font-medium flex-shrink-0">Change</button>
                </div>
              ) : (
                <div className="px-3 py-2.5 bg-[var(--admin-table-header-bg)] border border-dashed border-[var(--admin-border)] rounded-lg text-xs text-[var(--admin-text-muted)] text-center">No template selected — pick one on the left</div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-1.5">Subject line <span className="text-red-400">*</span></label>
              <input type="text" value={subject} disabled={isSent || isScheduled} onChange={(e) => updateField({ subject: e.target.value })} placeholder="What's in this week's newsletter?"
                className="w-full px-3 py-2 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] disabled:opacity-50 placeholder:text-[var(--admin-text-muted)]" />
            </div>

            {/* Preview text */}
            <div>
              <label className="block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-1.5">Preview text <span className="text-[var(--admin-text-muted)] font-normal normal-case">(optional)</span></label>
              <input type="text" value={previewText} disabled={isSent || isScheduled} onChange={(e) => updateField({ previewText: e.target.value })} placeholder="Short text shown after subject in inbox…"
                className="w-full px-3 py-2 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] disabled:opacity-50 placeholder:text-[var(--admin-text-muted)]" />
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-2">Send to</label>
              <div className="space-y-2">
                {RECIPIENTS_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => !isSent && !isScheduled && updateField({ recipientsType: opt.value })}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition ${recipientsType === opt.value ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10" : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50 bg-[var(--admin-table-header-bg)]"} ${isSent || isScheduled ? "opacity-60 cursor-default" : "cursor-pointer"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${recipientsType === opt.value ? "border-[var(--admin-accent)]" : "border-[var(--admin-border)]"}`}>
                      {recipientsType === opt.value && <div className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${recipientsType === opt.value ? "text-[var(--admin-accent)]" : "text-[var(--admin-text)]"}`}>{opt.label}</p>
                      <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-1.5">Campaign name <span className="text-[var(--admin-text-muted)] font-normal normal-case">(internal)</span></label>
              <input type="text" value={campaignName} disabled={isSent || isScheduled} onChange={(e) => updateField({ name: e.target.value })} placeholder="e.g. March 4 Weekly Briefing"
                className="w-full px-3 py-2 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] disabled:opacity-50 placeholder:text-[var(--admin-text-muted)]" />
            </div>
          </div>

          {/* ── BOTTOM ACTION BUTTONS ── */}
          {!isSent && !isScheduled && (
            <div className="p-5 border-t border-[var(--admin-border)] space-y-2.5">
              {scheduledAt && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs font-semibold text-amber-400 truncate flex-1">{formatScheduledAt(scheduledAt)}</p>
                  <button onClick={clearSchedule} className="text-amber-500 hover:text-amber-300 text-sm flex-shrink-0">✕</button>
                </div>
              )}
              <button onClick={() => setShowScheduleModal(true)} disabled={!selectedTemplate || !subject.trim()}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--admin-text)] border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] hover:bg-[var(--admin-table-row-hover)] rounded-lg transition disabled:opacity-40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {scheduledAt ? "Change Schedule" : "Schedule Send"}
              </button>
              <button onClick={() => saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate?.id ?? null, scheduledAt, "draft")} disabled={saving}
                className="w-full py-2.5 text-sm font-semibold text-[var(--admin-text)] border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] hover:bg-[var(--admin-table-row-hover)] rounded-lg transition disabled:opacity-40">
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button onClick={() => handleSend(false)} disabled={sending || !selectedTemplate || !subject.trim()}
                className="w-full py-3 text-sm font-semibold text-black bg-[var(--admin-accent)] rounded-lg hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2">
                {sending
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-r-transparent" /> {scheduledAt && new Date(scheduledAt) > new Date() ? "Scheduling…" : "Sending…"}</>
                  : scheduledAt && new Date(scheduledAt) > new Date()
                    ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Confirm Schedule</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Send Campaign</>}
              </button>
              <p className="text-[10px] text-[var(--admin-text-muted)] text-center">Use &ldquo;Super Admins Only&rdquo; to review before sending to all subscribers.</p>
            </div>
          )}

          {isSent && (
            <div className="p-5 border-t border-[var(--admin-border)]">
              <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-700/40 rounded-lg">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div><p className="text-sm font-semibold text-green-400">Campaign Sent</p><p className="text-xs text-green-500/70">This campaign is read-only.</p></div>
              </div>
            </div>
          )}

          {isScheduled && scheduledAt && (
            <div className="p-5 border-t border-[var(--admin-border)]">
              <div className="flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                <svg className="w-6 h-6 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <div>
                  <p className="text-sm font-semibold text-amber-400">Scheduled</p>
                  <p className="text-xs text-amber-500/70">{formatScheduledAt(scheduledAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showScheduleModal && <ScheduleModal recipientsType={recipientsType} onSchedule={handleSchedule} onClose={() => setShowScheduleModal(false)} />}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {templatePickModal && !duplicating && (
        <TemplatePicker
          template={templatePickModal}
          onUseAsIs={() => { applyTemplate(templatePickModal); setTemplatePickModal(null); }}
          onDuplicate={(name) => handleDuplicate(templatePickModal, name)}
          onClose={() => setTemplatePickModal(null)}
        />
      )}
      {duplicating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-8 flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
            <p className="text-sm font-semibold text-[var(--admin-text)]">Creating duplicate template…</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function CampaignNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
        </div>
      }
    >
      <CampaignNewInner />
    </Suspense>
  );
}
