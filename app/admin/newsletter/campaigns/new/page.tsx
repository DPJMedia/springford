"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-[color:var(--color-dark)] mb-2">{title}</h2>
          <p className="text-sm text-[color:var(--color-medium)]">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[color:var(--color-riviera-blue)] text-white hover:opacity-90"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <span className="text-xs font-semibold text-[color:var(--color-riviera-blue)] uppercase tracking-wide">New Campaign</span>
            </div>
            <button onClick={onCancel} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition text-lg leading-none">✕</button>
          </div>
          <h2 className="text-lg font-bold text-[color:var(--color-dark)]">Name your campaign</h2>
          <p className="text-sm text-[color:var(--color-medium)] mt-0.5">Give this campaign an internal name to identify it later.</p>
        </div>
        <div className="px-6 py-5">
          <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. March Weekly Briefing"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); if (e.key === "Escape") onCancel(); }} />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={() => name.trim() && onConfirm(name.trim())} disabled={!name.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[color:var(--color-riviera-blue)] text-white rounded-xl hover:opacity-90 transition disabled:opacity-40">
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
  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");

  function getLabel() {
    try {
      return new Date(`${date}T${time}:00`).toLocaleString("en-US", {
        timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric",
        year: "numeric", hour: "numeric", minute: "2-digit",
      }) + " ET";
    } catch { return ""; }
  }

  function handleSchedule() {
    try {
      // Interpret the entered date+time as America/New_York (handles DST correctly).
      // Probe with EST (-05:00) first; if ET displays a different hour it means we are
      // in EDT (-04:00), so switch to that offset instead.
      const estDate = new Date(`${date}T${time}:00-05:00`);
      const etParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(estDate);
      const etHour = parseInt(etParts.find((p) => p.type === "hour")?.value ?? "0", 10);
      const inputHour = parseInt(time.split(":")[0], 10);
      const isoUtc =
        etHour === inputHour
          ? estDate.toISOString()
          : new Date(`${date}T${time}:00-04:00`).toISOString();
      onSchedule(isoUtc);
    } catch {
      onSchedule(new Date(`${date}T${time}:00`).toISOString());
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[color:var(--color-dark)]">Schedule Campaign</h2>
          <p className="text-sm text-[color:var(--color-medium)] mt-0.5">Set a date and time to automatically send.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label><input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]" /></div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Time <span className="font-normal normal-case text-gray-400">(Eastern Time)</span></label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]" /></div>
          {date && time && <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl"><p className="text-xs text-[color:var(--color-riviera-blue)] font-semibold">Will send to {RECIPIENTS_OPTIONS.find((o) => o.value === recipientsType)?.label}</p><p className="text-sm font-bold text-[color:var(--color-dark)] mt-0.5">{getLabel()}</p></div>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSchedule} disabled={!date || !time} className="flex-1 py-2.5 text-sm font-semibold bg-[color:var(--color-riviera-blue)] text-white rounded-xl hover:opacity-90 transition disabled:opacity-40">Schedule</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[color:var(--color-dark)]">Select Template</h2>
          <p className="text-sm text-[color:var(--color-riviera-blue)] font-medium mt-0.5">{template.name}</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <button onClick={() => setMode("use")}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition ${mode === "use" ? "border-[color:var(--color-riviera-blue)] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${mode === "use" ? "border-[color:var(--color-riviera-blue)]" : "border-gray-300"}`}>
              {mode === "use" && <div className="w-2 h-2 rounded-full bg-[color:var(--color-riviera-blue)]" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${mode === "use" ? "text-[color:var(--color-riviera-blue)]" : "text-[color:var(--color-dark)]"}`}>Use as-is</p>
              <p className="text-xs text-gray-400 mt-0.5">This campaign uses the template directly. Changes to the template will affect this campaign preview.</p>
            </div>
          </button>
          <button onClick={() => setMode("duplicate")}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition ${mode === "duplicate" ? "border-[color:var(--color-riviera-blue)] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${mode === "duplicate" ? "border-[color:var(--color-riviera-blue)]" : "border-gray-300"}`}>
              {mode === "duplicate" && <div className="w-2 h-2 rounded-full bg-[color:var(--color-riviera-blue)]" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${mode === "duplicate" ? "text-[color:var(--color-riviera-blue)]" : "text-[color:var(--color-dark)]"}`}>Duplicate & customize</p>
              <p className="text-xs text-gray-400 mt-0.5">Creates an independent copy you can edit freely.</p>
              {mode === "duplicate" && (
                <input ref={inputRef} type="text" value={dupName} onChange={(e) => setDupName(e.target.value)}
                  placeholder="Name for the duplicate"
                  className="mt-2 w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === "Enter" && dupName.trim()) { e.preventDefault(); onDuplicate(dupName.trim()); } }} />
              )}
            </div>
          </button>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={() => mode === "use" ? onUseAsIs() : (dupName.trim() && onDuplicate(dupName.trim()))}
            disabled={mode === "duplicate" && !dupName.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[color:var(--color-riviera-blue)] text-white rounded-xl hover:opacity-90 transition disabled:opacity-40">
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
      if (!p?.is_admin && !p?.is_super_admin) { router.push("/admin"); return; }

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

  async function handleSchedule(isoUtc: string) {
    setScheduledAt(isoUtc);
    setShowScheduleModal(false);
    await saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate?.id ?? null, isoUtc, "scheduled");
  }

  function clearSchedule() {
    setScheduledAt(null);
    saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate?.id ?? null, null, "draft");
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
        // Redirect to campaign dashboard after a short delay
        setTimeout(() => router.push("/admin/newsletter"), 2500);
      }
    } catch { setSendResult({ error: "Network error." }); }
    finally { setSending(false); }
  }

  function handleSend(testOnly: boolean) {
    if (!selectedTemplate) { setSendResult({ error: "Please select a template first." }); return; }
    if (!subject.trim()) { setSendResult({ error: "Please enter a subject line before sending." }); return; }
    const recipLabel = RECIPIENTS_OPTIONS.find((o) => o.value === recipientsType)?.label;
    const isTest = testOnly;
    setConfirmModal({
      title: isTest ? "Send test email?" : "Send campaign?",
      message: isTest
        ? "A preview will be sent to dylancobb2525@gmail.com only. The campaign will not be marked as sent."
        : `This will send to all ${recipLabel}. This cannot be undone.`,
      confirmLabel: isTest ? "Send Test" : "Send Campaign",
      onConfirm: () => { setConfirmModal(null); executeSend(isTest); },
    });
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

  if (loadingCampaign) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Campaign name prompt — shown immediately for new campaigns */}
      {showCampaignNameModal && <CampaignNameModal onConfirm={handleCampaignNameConfirm} onCancel={handleCampaignNameCancel} />}

      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link href="/admin/newsletter" className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition flex-shrink-0">← Newsletter</Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <span className="text-xs font-semibold text-[color:var(--color-riviera-blue)] uppercase tracking-wide">Campaign</span>
        </div>
        <input type="text" value={campaignName} disabled={isSent}
          onChange={(e) => updateField({ name: e.target.value })}
          className="text-base font-semibold text-[color:var(--color-dark)] bg-transparent border-0 focus:outline-none focus:ring-0 flex-1 min-w-0" />
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveStatus === "saved" && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
          {saveStatus === "error" && <span className="text-xs text-red-500 font-medium">Save failed</span>}
          {isSent && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Sent</span>}
          {!isSent && scheduledAt && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Scheduled</span>}
          {!isSent && <button onClick={() => handleSend(true)} disabled={sending || !selectedTemplate} className="px-3 py-1.5 text-xs font-semibold text-[color:var(--color-riviera-blue)] border border-[color:var(--color-riviera-blue)] rounded-lg hover:bg-blue-50 transition disabled:opacity-40">Send Test</button>}
        </div>
      </div>


      {/* Send result */}
      {sendResult && (
        <div className={`px-4 py-3 flex items-center gap-3 border-b ${sendResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {sendResult.success
            ? <><svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><p className="text-sm text-green-800">Sent to <strong>{sendResult.sentTo}</strong> — check your inbox!</p></>
            : <><svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg><p className="text-sm text-red-800">{sendResult.error || "Send failed."}</p></>}
          <button onClick={() => setSendResult(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
      )}

      {/* SPLIT SCREEN */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Email preview / template picker */}
        <div className="flex-1 overflow-y-auto bg-gray-100 border-r border-gray-200">
          {!selectedTemplate ? (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[color:var(--color-dark)] mb-1">Select a Template</h2>
                  <p className="text-sm text-[color:var(--color-medium)]">Choose the email layout for this campaign.</p>
                </div>
                <button onClick={goToCreateTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white font-semibold rounded-xl text-sm hover:opacity-90 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create New Template
                </button>
              </div>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--color-riviera-blue)] border-r-transparent" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                  <p className="text-lg font-semibold text-[color:var(--color-dark)] mb-2">No templates yet</p>
                  <p className="text-sm text-[color:var(--color-medium)] mb-6">Create a template before sending a campaign.</p>
                  <button onClick={goToCreateTemplate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-riviera-blue)] text-white font-semibold rounded-lg hover:opacity-90 transition text-sm">Create a Template</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map((tmpl) => (
                    <button key={tmpl.id} onClick={() => setTemplatePickModal(tmpl)}
                      className="text-left bg-white rounded-2xl border-2 border-gray-200 hover:border-[color:var(--color-riviera-blue)] hover:shadow-md transition p-5 group">
                      <div className="w-full h-32 bg-gray-50 rounded-lg border border-gray-100 mb-4 overflow-hidden relative">
                        <iframe srcDoc={buildEmailHtml(tmpl.blocks, tmpl.name)} title={tmpl.name}
                          className="w-full h-full pointer-events-none"
                          style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", height: "222%" }}
                          sandbox="allow-same-origin" />
                        <div className="absolute inset-0 group-hover:bg-[#2b8aa8]/5 transition rounded-lg" />
                      </div>
                      <p className="font-semibold text-[color:var(--color-dark)] text-sm group-hover:text-[color:var(--color-riviera-blue)] transition">{tmpl.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
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
                  <button onClick={() => setSelectedTemplate(null)} className="text-xs text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition flex items-center gap-1 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Change
                  </button>
                  <span className="text-gray-300 flex-shrink-0">|</span>
                  <span className="text-xs font-semibold text-gray-500 truncate">Using: <span className="text-[color:var(--color-riviera-blue)]">{selectedTemplate.name}</span></span>
                </div>
                {!isSent && (
                  <button onClick={goToEditTemplate}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[color:var(--color-riviera-blue)] text-white font-semibold text-xs rounded-lg hover:opacity-90 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit Template
                  </button>
                )}
              </div>
              <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <iframe srcDoc={previewHtml} title="Email preview" className="w-full h-full" sandbox="allow-same-origin" />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Settings panel */}
        <div className="w-80 flex-shrink-0 bg-white overflow-y-auto flex flex-col">
          <div className="flex-1 p-5 space-y-5">
            <div>
              <h2 className="text-base font-bold text-[color:var(--color-dark)] mb-0.5">Campaign Settings</h2>
              <p className="text-xs text-[color:var(--color-medium)]">Configure how and to whom this email will be sent.</p>
            </div>

            {/* Template indicator */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Template</label>
              {selectedTemplate ? (
                <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--color-dark)] truncate">{selectedTemplate.name}</p>
                    <p className="text-xs text-[color:var(--color-medium)]">{selectedTemplate.blocks.length} blocks · {articleLayout} layout</p>
                  </div>
                  <button onClick={() => setSelectedTemplate(null)} className="text-xs text-[color:var(--color-riviera-blue)] hover:opacity-70 transition font-medium flex-shrink-0">Change</button>
                </div>
              ) : (
                <div className="px-3 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs text-gray-400 text-center">No template selected — pick one on the left</div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subject line <span className="text-red-400">*</span></label>
              <input type="text" value={subject} disabled={isSent} onChange={(e) => updateField({ subject: e.target.value })} placeholder="What's in this week's newsletter?"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)] disabled:bg-gray-50 disabled:text-gray-400" />
            </div>

            {/* Preview text */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Preview text <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
              <input type="text" value={previewText} disabled={isSent} onChange={(e) => updateField({ previewText: e.target.value })} placeholder="Short text shown after subject in inbox…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)] disabled:bg-gray-50 disabled:text-gray-400" />
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Send to</label>
              <div className="space-y-2">
                {RECIPIENTS_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => !isSent && updateField({ recipientsType: opt.value })}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition ${recipientsType === opt.value ? "border-[color:var(--color-riviera-blue)] bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"} ${isSent ? "opacity-60 cursor-default" : "cursor-pointer"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${recipientsType === opt.value ? "border-[color:var(--color-riviera-blue)]" : "border-gray-300"}`}>
                      {recipientsType === opt.value && <div className="w-2 h-2 rounded-full bg-[color:var(--color-riviera-blue)]" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${recipientsType === opt.value ? "text-[color:var(--color-riviera-blue)]" : "text-[color:var(--color-dark)]"}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Campaign name <span className="text-gray-400 font-normal normal-case">(internal)</span></label>
              <input type="text" value={campaignName} disabled={isSent} onChange={(e) => updateField({ name: e.target.value })} placeholder="e.g. March 4 Weekly Briefing"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)] disabled:bg-gray-50 disabled:text-gray-400" />
            </div>
          </div>

          {/* ── BOTTOM ACTION BUTTONS ── */}
          {!isSent && (
            <div className="p-5 border-t border-gray-100 space-y-2.5">
              {scheduledAt && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs font-semibold text-amber-800 truncate flex-1">{formatScheduledAt(scheduledAt)}</p>
                  <button onClick={clearSchedule} className="text-amber-400 hover:text-amber-700 text-sm flex-shrink-0">✕</button>
                </div>
              )}
              <button onClick={() => setShowScheduleModal(true)} disabled={!selectedTemplate || !subject.trim()}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 border-2 border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition disabled:opacity-40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {scheduledAt ? "Change Schedule" : "Schedule Send"}
              </button>
              <button onClick={() => saveNow(campaignName, subject, previewText, recipientsType, selectedTemplate?.id ?? null, scheduledAt, "draft")} disabled={saving}
                className="w-full py-2.5 text-sm font-semibold text-gray-700 border-2 border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition disabled:opacity-40">
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button onClick={() => handleSend(false)} disabled={sending || !selectedTemplate || !subject.trim()}
                className="w-full py-3 text-sm font-bold text-white bg-[color:var(--color-riviera-blue)] rounded-xl hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2">
                {sending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" /> Sending…</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Send Campaign</>}
              </button>
              <p className="text-[10px] text-gray-400 text-center">Use "Super Admins Only" to review before sending to all subscribers.</p>
            </div>
          )}

          {isSent && (
            <div className="p-5 border-t border-gray-100">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div><p className="text-sm font-bold text-green-800">Campaign Sent</p><p className="text-xs text-green-600">This campaign is read-only.</p></div>
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
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
            <p className="text-sm font-semibold text-[color:var(--color-dark)]">Creating duplicate template…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignNewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" /></div>}>
      <CampaignNewInner />
    </Suspense>
  );
}
