"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdDisplay } from "@/components/AdDisplay";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { usePageTracking } from "@/lib/analytics/usePageTracking";
import type { CalendarEvent, CalendarEntryType } from "@/lib/types/database";

/** Article details resolved for entry_type='article' rows (for linking + thumbnail). */
type LinkedArticle = { id: string; slug: string; title: string; image_url: string | null };

type DayCellData = { date: Date; iso: string; inMonth: boolean; isToday: boolean };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COLOR_PRESETS = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#16a34a" },
  { name: "Red", hex: "#dc2626" },
  { name: "Amber", hex: "#d97706" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Pink", hex: "#db2777" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Slate", hex: "#475569" },
];
const DEFAULT_COLOR = COLOR_PRESETS[0].hex;

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(year: number, month: number): DayCellData[][] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to the Sunday on/before the 1st
  const todayIso = toISODate(new Date());

  const weeks: DayCellData[][] = [];
  const cursor = new Date(start);
  // Always render whole weeks until we've passed the month; 6 rows max keeps height stable.
  for (let w = 0; w < 6; w++) {
    const week: DayCellData[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = toISODate(cursor);
      week.push({
        date: new Date(cursor),
        iso,
        inMonth: cursor.getMonth() === month,
        isToday: iso === todayIso,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Stop after we've rendered a full week that's entirely past the month (keeps 5–6 rows).
    if (cursor.getMonth() !== month && cursor > first && weeks.length >= 5) break;
  }
  return weeks;
}

function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":");
    const hour = Number(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:${m}${ampm}`;
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  return "";
}

export default function CalendarPage() {
  const { id: tenantId, name: siteName } = useTenant();
  const supabase = useMemo(() => createClient(), []);

  usePageTracking({ tenantId, viewType: "other", trackScroll: false });

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [linkedArticles, setLinkedArticles] = useState<Record<string, LinkedArticle>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorEntry, setEditorEntry] = useState<CalendarEvent | null>(null);
  const [editorDate, setEditorDate] = useState<string>(toISODate(today));

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Group events by ISO date for O(1) cell lookup.
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      (map[e.event_date] ||= []).push(e);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    }
    return map;
  }, [events]);

  const loadEvents = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const firstIso = toISODate(new Date(year, month, 1));
    const lastIso = toISODate(new Date(year, month + 1, 0));

    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("event_date", firstIso)
      .lte("event_date", lastIso)
      .order("start_time", { ascending: true });

    const rows = (data || []) as CalendarEvent[];
    setEvents(rows);

    // Resolve linked articles (slug/title/image) for 'article' entries.
    const articleIds = [...new Set(rows.map((r) => r.article_id).filter(Boolean))] as string[];
    if (articleIds.length > 0) {
      const { data: arts } = await supabase
        .from("articles")
        .select("id, slug, title, image_url")
        .eq("tenant_id", tenantId)
        .in("id", articleIds);
      const map: Record<string, LinkedArticle> = {};
      for (const a of (arts || []) as LinkedArticle[]) map[a.id] = a;
      setLinkedArticles(map);
    } else {
      setLinkedArticles({});
    }
    setLoading(false);
  }, [supabase, tenantId, year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin, is_super_admin")
        .eq("id", user.id)
        .single();
      if (active && (profile?.is_admin || profile?.is_super_admin)) setIsAdmin(true);
    })();
    return () => { active = false; };
  }, [supabase, tenantId]);

  function goPrevMonth() {
    setMonth((m) => (m === 0 ? 11 : m - 1));
    setYear((y) => (month === 0 ? y - 1 : y));
  }
  function goNextMonth() {
    setMonth((m) => (m === 11 ? 0 : m + 1));
    setYear((y) => (month === 11 ? y + 1 : y));
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  function openNewEntry(dateIso: string) {
    setEditorEntry(null);
    setEditorDate(dateIso);
    setEditorOpen(true);
  }
  function openEditEntry(entry: CalendarEvent) {
    setEditorEntry(entry);
    setEditorDate(entry.event_date);
    setEditorOpen(true);
  }

  async function deleteEntry(entry: CalendarEvent) {
    if (!confirm("Delete this calendar entry?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", entry.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    await loadEvents();
  }

  const selectedDayEvents = selectedDay ? eventsByDay[selectedDay] || [] : [];

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-surface)]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(140px,170px)_minmax(0,1fr)_minmax(140px,170px)]">
            {/* Left ad rail: 2 squares (desktop only) */}
            <aside className="hidden lg:flex lg:flex-col lg:gap-4">
              <AdDisplay adSlot="calendar-left-1" className="w-full" hidePlaceholder />
              <AdDisplay adSlot="calendar-left-2" className="w-full" hidePlaceholder />
            </aside>

            {/* Calendar — fills the first viewport on desktop; bottom banner sits just below the fold */}
            <section className="flex min-h-0 flex-col lg:min-h-[calc(100vh-9rem)]">
              {/* Month header */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    aria-label="Previous month"
                    className="rounded-md p-2 text-[color:var(--color-dark)] transition hover:bg-black/10"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <h1 className="min-w-[10ch] text-center text-xl font-black text-[color:var(--color-dark)] sm:text-2xl">
                    {MONTH_NAMES[month]} {year}
                  </h1>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    aria-label="Next month"
                    className="rounded-md p-2 text-[color:var(--color-dark)] transition hover:bg-black/10"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={goToday}
                    className="ml-1 rounded-full border border-black/20 px-3 py-1.5 text-xs font-semibold text-[color:var(--color-dark)] transition hover:bg-black/10"
                  >
                    Today
                  </button>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openNewEntry(toISODate(new Date(year, month, today.getMonth() === month ? today.getDate() : 1)))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-riviera-blue)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    aria-label="Add calendar entry"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add
                  </button>
                )}
              </div>

              {/* Weekday row */}
              <div className="grid grid-cols-7 gap-1 pb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-medium)] sm:text-xs">
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d[0]}</span>
                  </div>
                ))}
              </div>

              {/* Weeks grid — fills remaining height on desktop */}
              <div
                className="grid min-h-0 flex-1 grid-cols-7 gap-1"
                style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(84px, 1fr))` }}
              >
                {weeks.flat().map((cell) => {
                  const dayEvents = eventsByDay[cell.iso] || [];
                  return (
                    <button
                      type="button"
                      key={cell.iso}
                      onClick={() => setSelectedDay(cell.iso)}
                      className={`group relative flex min-h-0 flex-col overflow-hidden rounded-lg border p-1.5 text-left transition sm:p-2 ${
                        cell.inMonth ? "bg-white border-gray-200 hover:border-[color:var(--color-riviera-blue)]" : "bg-gray-50/60 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            cell.isToday
                              ? "bg-[color:var(--color-riviera-blue)] text-white"
                              : cell.inMonth ? "text-[color:var(--color-dark)]" : "text-gray-400"
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        {isAdmin && cell.inMonth && (
                          <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => { e.stopPropagation(); openNewEntry(cell.iso); }}
                            className="hidden rounded p-0.5 text-[color:var(--color-medium)] hover:bg-black/10 group-hover:inline-flex"
                            aria-label="Add entry to this day"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: e.color || DEFAULT_COLOR }}
                            title={e.title}
                          >
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="px-1 text-[10px] font-semibold text-[color:var(--color-medium)]">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {loading && (
                <p className="pt-2 text-center text-xs text-[color:var(--color-medium)]">Loading events…</p>
              )}
            </section>

            {/* Right ad rail: 2 squares (desktop only) */}
            <aside className="hidden lg:flex lg:flex-col lg:gap-4">
              <AdDisplay adSlot="calendar-right-1" className="w-full" hidePlaceholder />
              <AdDisplay adSlot="calendar-right-2" className="w-full" hidePlaceholder />
            </aside>
          </div>

          {/* Bottom horizontal banner — scroll below the calendar (desktop) */}
          <div className="mt-4 hidden lg:block">
            <AdDisplay adSlot="calendar-bottom-banner" className="w-full" hidePlaceholder />
          </div>
        </div>
      </main>

      <Footer />

      {/* Day details popup */}
      {selectedDay && (
        <DayModal
          dateIso={selectedDay}
          events={selectedDayEvents}
          linkedArticles={linkedArticles}
          isAdmin={isAdmin}
          onClose={() => setSelectedDay(null)}
          onAdd={() => openNewEntry(selectedDay)}
          onEdit={openEditEntry}
          onDelete={deleteEntry}
        />
      )}

      {/* Admin editor */}
      {editorOpen && isAdmin && (
        <EntryEditor
          tenantId={tenantId}
          siteName={siteName}
          entry={editorEntry}
          defaultDate={editorDate}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => { setEditorOpen(false); await loadEvents(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Day details modal ─────────────────────────── */

function DayModal({
  dateIso,
  events,
  linkedArticles,
  isAdmin,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: {
  dateIso: string;
  events: CalendarEvent[];
  linkedArticles: Record<string, LinkedArticle>;
  isAdmin: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (e: CalendarEvent) => void;
  onDelete: (e: CalendarEvent) => void;
}) {
  const dateLabel = useMemo(() => {
    const [y, m, d] = dateIso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  }, [dateIso]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-[color:var(--color-dark)]">{dateLabel}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-[color:var(--color-medium)]">Nothing scheduled for this day.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => {
              const article = e.article_id ? linkedArticles[e.article_id] : undefined;
              const href = article ? `/article/${article.slug}` : null;
              const image = e.image_url || article?.image_url || null;
              const time = formatTimeRange(e.start_time, e.end_time);
              const body = (
                <div className="flex gap-3">
                  <span className="mt-1 h-full w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.color || DEFAULT_COLOR }} />
                  {image && (
                    <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {e.entry_type === "article" && (
                        <span className="rounded bg-[color:var(--color-riviera-blue)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--color-riviera-blue)]">Article</span>
                      )}
                      <h3 className="truncate font-bold text-[color:var(--color-dark)]">{article?.title || e.title}</h3>
                    </div>
                    {time && <p className="text-xs font-semibold text-[color:var(--color-medium)]">{time}</p>}
                    {e.location && <p className="text-xs text-[color:var(--color-medium)]">📍 {e.location}</p>}
                    {e.description && <p className="mt-1 text-sm text-[color:var(--color-medium)] line-clamp-3">{e.description}</p>}
                  </div>
                </div>
              );
              return (
                <li key={e.id} className="rounded-lg border border-gray-200 p-3">
                  {href ? (
                    <Link href={href} className="block hover:opacity-90">{body}</Link>
                  ) : body}
                  {isAdmin && (
                    <div className="mt-2 flex justify-end gap-2 border-t border-gray-100 pt-2">
                      <button type="button" onClick={() => onEdit(e)} className="rounded-md px-2 py-1 text-xs font-semibold text-[color:var(--color-riviera-blue)] hover:bg-black/5">Edit</button>
                      <button type="button" onClick={() => onDelete(e)} className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-sm font-semibold text-[color:var(--color-medium)] transition hover:border-[color:var(--color-riviera-blue)] hover:text-[color:var(--color-riviera-blue)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add to this day
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Admin entry editor ─────────────────────────── */

function EntryEditor({
  tenantId,
  siteName,
  entry,
  defaultDate,
  onClose,
  onSaved,
}: {
  tenantId: string;
  siteName: string;
  entry: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [type, setType] = useState<CalendarEntryType>(entry?.entry_type || "event");
  const [title, setTitle] = useState(entry?.title || "");
  const [date, setDate] = useState(entry?.event_date || defaultDate);
  const [description, setDescription] = useState(entry?.description || "");
  const [color, setColor] = useState(entry?.color || DEFAULT_COLOR);
  const [imageUrl, setImageUrl] = useState<string | null>(entry?.image_url || null);
  const [startTime, setStartTime] = useState(entry?.start_time?.slice(0, 5) || "");
  const [endTime, setEndTime] = useState(entry?.end_time?.slice(0, 5) || "");
  const [location, setLocation] = useState(entry?.location || "");
  const [articleId, setArticleId] = useState<string | null>(entry?.article_id || null);
  const [articleQuery, setArticleQuery] = useState("");
  const [articleResults, setArticleResults] = useState<LinkedArticle[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Article search (published, tenant-scoped) for entry_type='article'.
  useEffect(() => {
    if (type !== "article" || articleQuery.trim().length < 2) {
      setArticleResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, slug, title, image_url")
        .eq("tenant_id", tenantId)
        .eq("status", "published")
        .ilike("title", `%${articleQuery.trim()}%`)
        .order("published_at", { ascending: false })
        .limit(8);
      if (active) setArticleResults((data || []) as LinkedArticle[]);
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [articleQuery, type, supabase, tenantId]);

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `calendar/${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("article-images").upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("article-images").getPublicUrl(fileName);
      setImageUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  function pickArticle(a: LinkedArticle) {
    setArticleId(a.id);
    // Article entries derive their title (and image) from the linked article itself.
    setTitle(a.title);
    setImageUrl(a.image_url);
    setArticleQuery(a.title);
    setArticleResults([]);
  }

  async function handleSave() {
    setError(null);
    if (!date) { setError("Please choose a date."); return; }
    if (type === "article") {
      if (!articleId) { setError("Please pick an article to link."); return; }
    } else if (!title.trim()) {
      setError("Please enter a title."); return;
    }

    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      event_date: date,
      entry_type: type,
      title: title.trim(),
      description: description.trim() || null,
      color,
      // Article entries show the linked article's image (kept in sync); events store their own.
      image_url: type === "event" ? imageUrl : null,
      article_id: articleId, // linking allowed for both types
      start_time: type === "event" ? (startTime || null) : null,
      end_time: type === "event" ? (endTime || null) : null,
      location: type === "event" ? (location.trim() || null) : null,
    };

    const { error: saveErr } = entry
      ? await supabase.from("calendar_events").update(payload).eq("id", entry.id)
      : await supabase.from("calendar_events").insert(payload);

    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[color:var(--color-dark)]">
            {entry ? "Edit entry" : "Add to calendar"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Type toggle */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["event", "article"] as CalendarEntryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                type === t
                  ? "border-[color:var(--color-riviera-blue)] bg-[color:var(--color-riviera-blue)]/10 text-[color:var(--color-riviera-blue)]"
                  : "border-gray-200 text-[color:var(--color-medium)] hover:bg-gray-50"
              }`}
            >
              {t === "event" ? "Event" : "Article"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {type === "article" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Link a published article{siteName ? ` from ${siteName}` : ""}</label>
              <input
                type="text"
                value={articleQuery}
                onChange={(e) => { setArticleQuery(e.target.value); setArticleId(null); }}
                placeholder="Search article titles…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--color-riviera-blue)] focus:outline-none"
              />
              {articleResults.length > 0 && (
                <ul className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-gray-200">
                  {articleResults.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => pickArticle(a)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                        {a.image_url && <img src={a.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                        <span className="truncate">{a.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {articleId && <p className="mt-1 text-xs font-semibold text-green-700">✓ Article linked</p>}
            </div>
          )}

          {type === "event" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Farmers Market on Main St"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--color-riviera-blue)] focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--color-riviera-blue)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Color</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    aria-label={c.name}
                    title={c.name}
                    className={`h-6 w-6 rounded-full ring-2 ring-offset-1 transition ${color === c.hex ? "ring-[color:var(--color-dark)]" : "ring-transparent"}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {type === "event" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Start time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--color-riviera-blue)] focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">End time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--color-riviera-blue)] focus:outline-none" />
              </div>
            </div>
          )}

          {type === "event" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Memorial Park" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--color-riviera-blue)] focus:outline-none" />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Details shown when a reader opens the day…" className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--color-riviera-blue)] focus:outline-none" />
          </div>

          {type === "event" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-dark)]">Image (optional)</label>
              <div className="flex items-center gap-3">
                {imageUrl && <img src={imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />}
                <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-[color:var(--color-dark)] transition hover:bg-gray-50">
                  {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
                {imageUrl && (
                  <button type="button" onClick={() => setImageUrl(null)} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
                )}
              </div>
            </div>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-[color:var(--color-medium)] hover:bg-gray-100">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="rounded-lg bg-[color:var(--color-riviera-blue)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : entry ? "Save changes" : "Add entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
