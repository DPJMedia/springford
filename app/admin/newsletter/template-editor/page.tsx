"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { getAdSlotLabel } from "@/lib/advertising/adSlots";
import type { NewsletterBlock, BlockType, Alignment, ArticleLayout } from "@/lib/newsletter/buildEmailHtml";
import { buildEmailHtml } from "@/lib/newsletter/buildEmailHtml";

// ─── Types / Helpers ──────────────────────────────────────────────────────────

interface Article {
  id: string; title: string; slug: string; excerpt: string | null;
  image_url: string | null; section: string; sections: string[]; published_at: string | null;
  is_advertisement?: boolean | null;
}

function newBlock(type: BlockType): NewsletterBlock {
  const id = `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case "hero_text": return { id, type, headline: "This Week in Spring Ford", subheadline: "", introText: "", alignment: "left" };
    case "article":   return { id, type, articleTitle: "", articleExcerpt: "", articleImageUrl: "", articleSlug: "", articleSection: "", articleIsAdvertisement: false };
    case "text":      return { id, type, textTitle: "", textBody: "", alignment: "left" };
    case "image":     return { id, type, imageUrl: "", imageLink: "", imageAlt: "" };
    case "button":        return { id, type, buttonText: "Read More", buttonLink: "https://www.springford.press", buttonColor: "#2b8aa8", alignment: "center" };
    case "advertisement": return { id, type, adId: "", adImageUrl: "", adLinkUrl: "", adTitle: "" };
    case "divider":       return { id, type };
    case "spacer":        return { id, type, spacerHeight: 24 };
    default:              return { id, type };
  }
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: string; desc: string }[] = [
  { type: "hero_text",     label: "Headline",    icon: "H",  desc: "Big headline + intro" },
  { type: "article",       label: "Article",     icon: "📰", desc: "Pick a site article" },
  { type: "text",          label: "Text",        icon: "T",  desc: "Title + body paragraph" },
  { type: "image",         label: "Image",       icon: "🖼", desc: "Image with optional link" },
  { type: "button",        label: "Button",      icon: "→",  desc: "CTA button" },
  { type: "advertisement", label: "Ad",          icon: "📢", desc: "Site advertisement" },
  { type: "divider",       label: "Divider",     icon: "—",  desc: "Horizontal rule" },
  { type: "spacer",        label: "Spacer",      icon: "⬜", desc: "Blank space" },
];

const LAYOUT_OPTIONS: { v: ArticleLayout; label: string; icon: React.ReactNode; min: number }[] = [
  { v: "stack",  label: "Stack",  min: 1, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="5" rx="1"/><rect x="3" y="11" width="18" height="5" rx="1"/><rect x="3" y="18" width="18" height="2" rx="1" strokeOpacity="0.4"/></svg> },
  { v: "2-col",  label: "2 Col",  min: 2, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="8" height="14" rx="1"/><rect x="13" y="4" width="8" height="14" rx="1"/></svg> },
  { v: "3-col",  label: "3 Col",  min: 3, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="6" height="14" rx="1"/><rect x="9" y="4" width="6" height="14" rx="1"/><rect x="16" y="4" width="6" height="14" rx="1"/></svg> },
  { v: "2x2",    label: "2×2",    min: 4, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg> },
];

// ─── Rich Text Editor ─────────────────────────────────────────────────────────

const FONT_SIZES = [
  { label: "Small",   value: "13px" },
  { label: "Normal",  value: "16px" },
  { label: "Large",   value: "20px" },
  { label: "Heading", value: "26px" },
];

function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const [activeFmt, setActiveFmt] = useState({ bold: false, italic: false });

  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
      lastValueRef.current = value;
    }
  }, [value]);

  function handleInput() {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  }

  function updateActiveFmt() {
    setActiveFmt({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic") });
  }

  function execFmt(command: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, undefined);
    handleInput();
    updateActiveFmt();
  }

  function applyFontSize(px: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    editorRef.current?.focus();
    if (sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    try {
      const span = document.createElement("span");
      span.style.fontSize = px;
      range.surroundContents(span);
    } catch {
      // Selection spans multiple nodes — wrap contents manually
      document.execCommand("fontSize", false, "7");
      editorRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
        const s = document.createElement("span");
        s.style.fontSize = px;
        s.innerHTML = (el as HTMLElement).innerHTML;
        el.parentNode?.replaceChild(s, el);
      });
    }
    handleInput();
  }

  const toolBtn = (active: boolean) =>
    `w-7 h-7 rounded flex items-center justify-center text-sm font-semibold transition border ${
      active ? "bg-[var(--admin-accent)] text-black border-[var(--admin-accent)]" : "bg-[var(--admin-table-header-bg)] text-[var(--admin-text-muted)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-table-row-hover)]"
    }`;

  return (
    <div className="border border-[var(--admin-border)] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[var(--admin-accent)] focus-within:border-transparent transition">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2.5 py-2 bg-[var(--admin-table-header-bg)] border-b border-[var(--admin-border)]">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt("bold"); }} className={toolBtn(activeFmt.bold)} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt("italic"); }} className={toolBtn(activeFmt.italic)} title="Italic (Ctrl+I)"><em>I</em></button>
        <div className="w-px h-5 bg-[var(--admin-border)] mx-1" />
        <select
          onChange={(e) => { if (e.target.value) applyFontSize(e.target.value); e.target.value = ""; }}
          defaultValue=""
          className="text-xs border border-[var(--admin-border)] rounded px-1.5 py-1 bg-[var(--admin-table-header-bg)] text-[var(--admin-text-muted)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
          title="Font size">
          <option value="" disabled>Size</option>
          {FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt("removeFormat"); }} className="ml-auto text-[10px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition px-1.5 py-0.5 rounded border border-transparent hover:border-[var(--admin-border)]" title="Clear formatting">Clear</button>
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateActiveFmt}
        onMouseUp={updateActiveFmt}
        data-placeholder={placeholder || "Write something…"}
        className="min-h-[120px] p-3 text-sm text-[var(--admin-text)] bg-[var(--admin-card-bg)] focus:outline-none"
        style={{ lineHeight: "1.75" }}
      />
      <style>{`[contenteditable]:empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }`}</style>
    </div>
  );
}

// ─── Name Prompt Modal ────────────────────────────────────────────────────────

function NamePromptModal({
  defaultName, onConfirm, onCancel,
}: { defaultName: string; onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-[var(--admin-border)]">
        <div className="px-6 py-5 border-b border-[var(--admin-border)]">
          <h2 className="text-lg font-semibold text-white">Name your template</h2>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">Give this template a descriptive name.</p>
        </div>
        <div className="px-6 py-5">
          <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Newsletter Layout"
            className="w-full px-3 py-2.5 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); if (e.key === "Escape") onCancel(); }} />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-lg hover:bg-[var(--admin-table-header-bg)] transition">Cancel</button>
          <button onClick={() => name.trim() && onConfirm(name.trim())} disabled={!name.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[var(--admin-accent)] text-black rounded-lg hover:opacity-90 transition disabled:opacity-40">
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alignment picker ─────────────────────────────────────────────────────────

function AlignPicker({ value, onChange }: { value?: Alignment; onChange: (a: Alignment) => void }) {
  return (
    <div className="flex gap-1">
      {(["left", "center", "right"] as Alignment[]).map((a) => (
        <button key={a} onClick={() => onChange(a)} title={a.charAt(0).toUpperCase() + a.slice(1)}
          className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition flex items-center justify-center ${
            (value || "left") === a
              ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]"
              : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-table-row-hover)]"
          }`}>
          {a === "left" && <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5h14a1 1 0 110 2H3a1 1 0 110-2zm0 4h10a1 1 0 110 2H3a1 1 0 110-2zm0 4h12a1 1 0 110 2H3a1 1 0 110-2z" clipRule="evenodd" /></svg>}
          {a === "center" && <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5h14a1 1 0 110 2H3a1 1 0 110-2zm3 4h8a1 1 0 110 2H6a1 1 0 110-2zm-2 4h12a1 1 0 110 2H4a1 1 0 110-2z" clipRule="evenodd" /></svg>}
          {a === "right" && <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5h14a1 1 0 110 2H3a1 1 0 110-2zm4 4h10a1 1 0 110 2H7a1 1 0 110-2zm-4 4h14a1 1 0 110 2H3a1 1 0 110-2z" clipRule="evenodd" /></svg>}
        </button>
      ))}
    </div>
  );
}

// ─── Article Picker ───────────────────────────────────────────────────────────

function ArticlePickerModal({ onSelect, onClose }: { onSelect: (a: Article) => void; onClose: () => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  useEffect(() => {
    supabase.from("articles").select("id,title,slug,excerpt,image_url,section,sections,published_at,is_advertisement")
      .eq("status", "published").order("published_at", { ascending: false }).limit(60)
      .then(({ data }) => { setArticles(data || []); setLoading(false); });
  }, [supabase]);
  const filtered = articles.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-[var(--admin-border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-border)]">
          <h2 className="text-lg font-semibold text-white">Pick an Article</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[var(--admin-table-header-bg)] flex items-center justify-center text-[var(--admin-text-muted)] transition">✕</button>
        </div>
        <div className="px-6 py-3 border-b border-[var(--admin-border)]">
          <input type="text" placeholder="Search articles…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]" autoFocus />
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          {loading ? <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-r-transparent" /></div>
          : filtered.length === 0 ? <p className="text-center text-[var(--admin-text-muted)] py-8 text-sm">No articles found.</p>
          : filtered.map((article) => (
            <button key={article.id} onClick={() => onSelect(article)}
              className="w-full text-left flex gap-3 p-3 rounded-lg hover:bg-[var(--admin-accent)]/10 border border-transparent hover:border-[var(--admin-accent)]/40 transition group">
              {article.image_url
                ? <img src={article.image_url} alt={article.title} className="w-20 h-14 object-cover rounded-lg flex-shrink-0" />
                : <div className="w-20 h-14 bg-[var(--admin-table-header-bg)] rounded-lg flex-shrink-0 flex items-center justify-center text-[var(--admin-text-muted)] text-xl">📰</div>}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--admin-accent)] uppercase tracking-wide mb-0.5">
                  {(article.sections?.filter((s) => s !== "hero")[0] || article.section || "").replace(/-/g, " ")}
                </p>
                <p className="text-sm font-semibold text-[var(--admin-text)] line-clamp-2 group-hover:text-[var(--admin-accent)] transition">{article.title}</p>
                {article.published_at && <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ad Picker Modal ──────────────────────────────────────────────────────────

// Slot name patterns that match ~8:1 leaderboard/banner ads
const LEADERBOARD_PATTERNS = ["content-top", "content-middle", "inline", "homepage-banner-top", "homepage-banner-bottom"];
// Slot name patterns that match ~2:1 mobile banner ads
const MOBILE_BANNER_PATTERNS = ["mobile"];

interface AdOption {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string;
  ad_slot: string;
  ratio: "8:1" | "2:1";
}

function AdPickerModal({ onSelect, onClose }: { onSelect: (ad: AdOption) => void; onClose: () => void }) {
  const [ads, setAds] = useState<AdOption[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAds() {
      const now = new Date().toISOString();
      // Fetch all active ads with their slot assignments
      const { data } = await supabase
        .from("ad_slot_assignments")
        .select("ad_slot, ads!inner(id, title, image_url, link_url, is_active, start_date, end_date)")
        .not("ads.image_url", "is", null);

      if (!data) { setLoading(false); return; }

      const seen = new Set<string>();
      const results: AdOption[] = [];

      for (const row of data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ad = (row as any).ads as { id: string; title: string | null; image_url: string; link_url: string; is_active: boolean; start_date: string; end_date: string };
        if (!ad || !ad.is_active) continue;
        if (new Date(ad.start_date) > new Date(now) || new Date(ad.end_date) < new Date(now)) continue;
        if (seen.has(ad.id + row.ad_slot)) continue;

        const slot: string = row.ad_slot || "";
        const isLeaderboard = LEADERBOARD_PATTERNS.some((p) => slot.includes(p));
        const isMobile = !isLeaderboard && MOBILE_BANNER_PATTERNS.some((p) => slot.includes(p));

        if (isLeaderboard || isMobile) {
          seen.add(ad.id + row.ad_slot);
          results.push({ id: ad.id, title: ad.title, image_url: ad.image_url, link_url: ad.link_url, ad_slot: slot, ratio: isLeaderboard ? "8:1" : "2:1" });
        }
      }

      setAds(results);
      setLoading(false);
    }
    fetchAds();
  }, [supabase]);

  const leaderboards = ads.filter((a) => a.ratio === "8:1");
  const mobileBanners = ads.filter((a) => a.ratio === "2:1");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-[var(--admin-border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-border)]">
          <div>
            <h2 className="text-lg font-semibold text-white">Pick an Advertisement</h2>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">Showing active 8:1 and 2:1 banner ads only.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[var(--admin-table-header-bg)] flex items-center justify-center text-[var(--admin-text-muted)] transition">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-r-transparent" /></div>
          ) : ads.length === 0 ? (
            <p className="text-center text-[var(--admin-text-muted)] py-8 text-sm">No active banner ads found (8:1 or 2:1 slots).</p>
          ) : (
            <div className="space-y-5">
              {leaderboards.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-widest mb-2 px-1">8:1 Leaderboard Banners</p>
                  <div className="space-y-2">
                    {leaderboards.map((ad) => (
                      <button key={ad.id + ad.ad_slot} onClick={() => onSelect(ad)}
                        className="w-full text-left flex flex-col gap-2 p-3 rounded-lg hover:bg-[var(--admin-accent)]/10 border border-[var(--admin-border)] hover:border-[var(--admin-accent)] transition group">
                        <img src={ad.image_url} alt={ad.title || "Ad"} className="w-full object-cover rounded" style={{ aspectRatio: "8/1", objectFit: "cover" }} />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] px-1.5 py-0.5 rounded">8:1</span>
                          <p className="text-xs font-semibold text-[var(--admin-text)] truncate group-hover:text-[var(--admin-accent)] transition">{ad.title || ad.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-[var(--admin-text-muted)] truncate ml-auto">{getAdSlotLabel(ad.ad_slot)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {mobileBanners.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-widest mb-2 px-1">2:1 Mobile Banners</p>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileBanners.map((ad) => (
                      <button key={ad.id + ad.ad_slot} onClick={() => onSelect(ad)}
                        className="text-left flex flex-col gap-2 p-3 rounded-lg hover:bg-[var(--admin-accent)]/10 border border-[var(--admin-border)] hover:border-[var(--admin-accent)] transition group">
                        <img src={ad.image_url} alt={ad.title || "Ad"} className="w-full object-cover rounded" style={{ aspectRatio: "2/1", objectFit: "cover" }} />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-semibold bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] px-1.5 py-0.5 rounded flex-shrink-0">2:1</span>
                          <p className="text-xs font-semibold text-[var(--admin-text)] truncate group-hover:text-[var(--admin-accent)] transition">{ad.title || ad.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-[var(--admin-text-muted)] truncate ml-auto min-w-0">{getAdSlotLabel(ad.ad_slot)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Block Editor Panel ───────────────────────────────────────────────────────

function BlockEditor({ block, onChange, onPickArticle, onPickAd }: {
  block: NewsletterBlock; onChange: (u: Partial<NewsletterBlock>) => void; onPickArticle: () => void; onPickAd: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const inp = "w-full px-3 py-2 text-sm border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-transparent";
  const lbl = "block text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-1";
  const field = "mb-4";

  async function handleImageUpload(file: File) {
    setUploading(true); setUploadError("");
    try {
      const ext = file.name.split(".").pop();
      const fileName = `newsletter/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("article-images").upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("article-images").getPublicUrl(fileName);
      onChange({ imageUrl: publicUrl });
    } catch (e: unknown) { setUploadError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  if (block.type === "hero_text") return (
    <div>
      <div className={field}><label className={lbl}>Alignment</label><AlignPicker value={block.alignment} onChange={(a) => onChange({ alignment: a })} /></div>
      <div className={field}><label className={lbl}>Headline</label><input className={inp} value={block.headline || ""} onChange={(e) => onChange({ headline: e.target.value })} placeholder="This Week in Spring Ford" /></div>
      <div className={field}><label className={lbl}>Sub-headline <span className="font-normal normal-case text-[var(--admin-text-muted)]">(optional)</span></label><input className={inp} value={block.subheadline || ""} onChange={(e) => onChange({ subheadline: e.target.value })} /></div>
      <div className={field}><label className={lbl}>Intro paragraph</label><textarea className={`${inp} resize-none`} rows={4} value={block.introText || ""} onChange={(e) => onChange({ introText: e.target.value })} /></div>
    </div>
  );

  if (block.type === "article") return (
    <div>
      <div className={field}>
        <button onClick={onPickArticle} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--admin-accent)]/10 border-2 border-dashed border-[var(--admin-accent)] text-[var(--admin-accent)] rounded-xl font-semibold text-sm hover:bg-[var(--admin-accent)]/20 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {block.articleTitle ? "Change Article" : "Pick Article from Site"}
        </button>
      </div>
      {block.articleTitle && (
        <div className="p-3 bg-[var(--admin-table-header-bg)] rounded-lg border border-[var(--admin-border)] mb-4">
          {block.articleImageUrl && <img src={block.articleImageUrl} alt={block.articleTitle} className="w-full h-24 object-cover rounded-lg mb-2" />}
          <p className="text-sm font-semibold text-[var(--admin-text)] line-clamp-2">{block.articleTitle}</p>
        </div>
      )}
      <div className={field}><label className={lbl}>Excerpt override</label><textarea className={`${inp} resize-none`} rows={3} value={block.articleExcerpt || ""} onChange={(e) => onChange({ articleExcerpt: e.target.value })} placeholder="Leave blank to use article excerpt" /></div>
    </div>
  );

  if (block.type === "text") return (
    <div>
      <div className={field}><label className={lbl}>Alignment</label><AlignPicker value={block.alignment} onChange={(a) => onChange({ alignment: a })} /></div>
      <div className={field}><label className={lbl}>Title <span className="font-normal normal-case text-[var(--admin-text-muted)]">(optional)</span></label><input className={inp} value={block.textTitle || ""} onChange={(e) => onChange({ textTitle: e.target.value })} /></div>
      <div className={field}>
        <label className={lbl}>Body text</label>
        <RichTextEditor value={block.textBody || ""} onChange={(html) => onChange({ textBody: html })} placeholder="Write your paragraph…" />
      </div>
    </div>
  );

  if (block.type === "image") return (
    <div>
      <div className={field}>
        <label className={lbl}>Image</label>
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleImageUpload(f); }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full border-2 border-dashed rounded-lg transition cursor-pointer ${uploading ? "border-[var(--admin-accent)]/50 bg-[var(--admin-accent)]/10" : "border-[var(--admin-border)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/10"}`}
          style={{ minHeight: block.imageUrl ? undefined : "96px" }}>
          {block.imageUrl
            ? <div className="relative"><img src={block.imageUrl} alt="preview" className="w-full rounded-lg object-cover max-h-40" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition rounded-lg flex items-center justify-center"><span className="text-white text-xs font-semibold">Click or drop to replace</span></div></div>
            : <div className="flex flex-col items-center justify-center py-6 px-4 text-center">{uploading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-r-transparent" /> : <><svg className="w-8 h-8 text-[var(--admin-text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p className="text-xs font-semibold text-[var(--admin-text-muted)]">Drop image here or click to upload</p><p className="text-xs text-[var(--admin-text-muted)] mt-0.5">PNG, JPG, WebP</p></>}</div>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
      </div>
      <div className="mb-4 p-3 bg-[var(--admin-table-header-bg)] rounded-lg border border-[var(--admin-border)] space-y-1.5">
        <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Recommended sizes</p>
        <div className="flex items-start gap-2"><span className="text-[10px] font-semibold bg-[var(--admin-accent)] text-black px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Banner</span><p className="text-xs text-[var(--admin-text-muted)] leading-snug"><strong className="text-[var(--admin-text)]">600 × 200 px</strong> — Wide thin banner. Ratio 3:1.</p></div>
        <div className="flex items-start gap-2"><span className="text-[10px] font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Feature</span><p className="text-xs text-[var(--admin-text-muted)] leading-snug"><strong className="text-[var(--admin-text)]">600 × 340 px</strong> — Feature photo or infographic. Ratio 16:9.</p></div>
      </div>
      <div className={field}><label className={lbl}>— or paste image URL —</label><input className={inp} value={block.imageUrl || ""} onChange={(e) => onChange({ imageUrl: e.target.value })} placeholder="https://…" /></div>
      <div className={field}><label className={lbl}>Link URL <span className="font-normal normal-case text-[var(--admin-text-muted)]">(optional)</span></label><input className={inp} value={block.imageLink || ""} onChange={(e) => onChange({ imageLink: e.target.value })} placeholder="https://…" /></div>
      <div className={field}><label className={lbl}>Alt text</label><input className={inp} value={block.imageAlt || ""} onChange={(e) => onChange({ imageAlt: e.target.value })} placeholder="Describe the image" /></div>
    </div>
  );

  if (block.type === "button") return (
    <div>
      <div className={field}>
        <label className={lbl}>Quick presets</label>
        <div className="space-y-1.5">
          {[{ label: "Advertise with Us", link: "https://www.springford.press/advertise", color: "#2b8aa8" },
            { label: "Support Us", link: "https://www.springford.press/support", color: "#2b8aa8" },
            { label: "Read Latest News", link: "https://www.springford.press", color: "#1a1a1a" }].map((preset) => (
            <button key={preset.label} onClick={() => onChange({ buttonText: preset.label, buttonLink: preset.link, buttonColor: preset.color })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition ${block.buttonText === preset.label && block.buttonLink === preset.link ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]" : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-table-row-hover)]"}`}>
              <span>{preset.label}</span>
              <span className="text-[10px] font-normal text-[var(--admin-text-muted)] truncate max-w-[110px]">{preset.link.replace("https://www.springford.press", "") || "/"}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={field}><label className={lbl}>Alignment</label><AlignPicker value={block.alignment || "center"} onChange={(a) => onChange({ alignment: a })} /></div>
      <div className={field}><label className={lbl}>Button label</label><input className={inp} value={block.buttonText || ""} onChange={(e) => onChange({ buttonText: e.target.value })} placeholder="Read More" /></div>
      <div className={field}><label className={lbl}>Link URL</label><input className={inp} value={block.buttonLink || ""} onChange={(e) => onChange({ buttonLink: e.target.value })} placeholder="https://…" /></div>
      <div className={field}>
        <label className={lbl}>Button color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={block.buttonColor || "#2b8aa8"} onChange={(e) => onChange({ buttonColor: e.target.value })} className="h-9 w-16 rounded cursor-pointer border border-[var(--admin-border)]" />
          <input className={`${inp} flex-1`} value={block.buttonColor || "#2b8aa8"} onChange={(e) => onChange({ buttonColor: e.target.value })} />
        </div>
      </div>
    </div>
  );

  if (block.type === "spacer") return (
    <div className={field}><label className={lbl}>Height (px)</label><input type="number" className={inp} value={block.spacerHeight ?? 24} min={8} max={120} onChange={(e) => onChange({ spacerHeight: parseInt(e.target.value) || 24 })} /></div>
  );

  if (block.type === "advertisement") return (
    <div>
      <div className={field}>
        <button onClick={onPickAd}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--admin-accent)]/10 border-2 border-dashed border-[var(--admin-accent)] text-[var(--admin-accent)] rounded-xl font-semibold text-sm hover:bg-[var(--admin-accent)]/20 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {block.adId ? "Change Ad" : "Pick Ad from Site"}
        </button>
      </div>
      {block.adImageUrl ? (
        <div className="mb-4 p-2 bg-[var(--admin-table-header-bg)] rounded-lg border border-[var(--admin-border)]">
          <img src={block.adImageUrl} alt={block.adTitle || "Ad"} className="w-full rounded object-cover" style={{ maxHeight: "80px", objectFit: "cover" }} />
          <p className="text-xs text-[var(--admin-text-muted)] mt-1.5 truncate">{block.adTitle || block.adId}</p>
          <p className="text-[10px] text-[var(--admin-text-muted)] truncate">{block.adLinkUrl}</p>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-[var(--admin-table-header-bg)] rounded-lg border border-dashed border-[var(--admin-border)] text-center">
          <p className="text-xs text-[var(--admin-text-muted)]">No ad selected yet</p>
          <p className="text-[10px] text-[var(--admin-text-muted)] mt-0.5">Only active 8:1 and 2:1 banner ads are shown.</p>
        </div>
      )}
    </div>
  );

  return <p className="text-sm text-[var(--admin-text-muted)]">No settings for this block.</p>;
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({ block, index, total, selected, onSelect, onMoveUp, onMoveDown, onDelete, onDragStart, onDragOver, onDrop }: {
  block: NewsletterBlock; index: number; total: number; selected: boolean;
  onSelect: () => void; onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void;
}) {
  const typeInfo = BLOCK_TYPES.find((b) => b.type === block.type);
  function getPreview() {
    switch (block.type) {
      case "hero_text": return block.headline || "(no headline)";
      case "article":   return block.articleTitle || "(no article selected)";
      case "text":      return block.textTitle || (block.textBody || "").replace(/<[^>]+>/g, "").slice(0, 60) || "(empty)";
      case "image":     return block.imageUrl ? "Image: " + block.imageUrl.split("/").pop() : "(no image)";
      case "button":        return `"${block.buttonText || "Button"}" → ${block.buttonLink || "(no link)"}`;
      case "advertisement": return block.adTitle || (block.adId ? `Ad: ${block.adId.slice(0, 12)}` : "(no ad selected)");
      case "divider":       return "──────────────";
      case "spacer":        return `${block.spacerHeight || 24}px space`;
      default:              return block.type;
    }
  }
  return (
    <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onClick={onSelect}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition ${selected ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 shadow-sm" : "border-[var(--admin-border)] bg-[var(--admin-card-bg)] hover:border-[var(--admin-accent)]/50 hover:shadow-sm"}`}>
      <div className="flex-shrink-0 text-[var(--admin-border)] cursor-grab hover:text-[var(--admin-text-muted)] transition" title="Drag to reorder">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 0a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM7 7a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1zm-4 5a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm4 0a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" /></svg>
      </div>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${selected ? "bg-[var(--admin-accent)] text-black" : "bg-[var(--admin-table-header-bg)] text-[var(--admin-text-muted)]"}`}>{typeInfo?.icon || "?"}</div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-[var(--admin-accent)] uppercase tracking-wide">{typeInfo?.label}</span>
        <p className="text-sm text-[var(--admin-text)] truncate">{getPreview()}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={onMoveUp} disabled={index === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-table-header-bg)] disabled:opacity-30 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg></button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-table-header-bg)] disabled:opacity-30 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-950/30 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 bg-[var(--admin-card-bg)] border-b border-[var(--admin-border)]">
        <h2 className="text-[var(--admin-text)] font-semibold text-sm">Template preview (as sent)</h2>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-[var(--admin-border)] text-[var(--admin-text)] rounded-lg text-sm font-semibold hover:bg-[var(--admin-table-header-bg)] transition"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6 flex justify-center bg-[#f0f2f4]">
        <div className="w-full max-w-2xl">
          <iframe
            srcDoc={html}
            title="Template preview"
            className="w-full rounded-xl border border-[#e0e3e8] bg-[#f0f2f4]"
            style={{ height: "80vh" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Template Editor ─────────────────────────────────────────────────────

function TemplateEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("id");
  const returnTo = searchParams.get("returnTo"); // URL to go back to (campaign creator)

  const [templateName, setTemplateName] = useState("New Template");
  const [blocks, setBlocks] = useState<NewsletterBlock[]>([]);
  const [articleLayout, setArticleLayout] = useState<ArticleLayout>("stack");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showArticlePicker, setShowArticlePicker] = useState(false);
  const [showAdPicker, setShowAdPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const [loading, setLoading] = useState(true);
  const dragIndexRef = useRef<number | null>(null);
  const currentTemplateId = useRef<string | null>(templateId);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("user_profiles").select("is_admin,is_super_admin").eq("id", user.id).single();
      if (!p?.is_admin && !p?.is_super_admin) { router.push("/admin/articles"); return; }
      if (templateId) {
        const { data: t } = await supabase.from("newsletter_templates").select("*").eq("id", templateId).single();
        if (t) {
          setTemplateName(t.name);
          setBlocks(Array.isArray(t.blocks) ? t.blocks : []);
          const settings = (t.settings as Record<string, unknown>) || {};
          if (settings.articleLayout) setArticleLayout(settings.articleLayout as ArticleLayout);
        }
      }
      setLoading(false);
    }
    init();
  }, [templateId, router, supabase]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;
  const articleCount = blocks.filter((b) => b.type === "article").length;
  const previewHtml = buildEmailHtml(blocks, templateName, undefined, undefined, articleLayout);

  const saveNow = useCallback(async (
    name: string, blks: NewsletterBlock[], layout: ArticleLayout, tId: string | null,
  ): Promise<string | null> => {
    setSaving(true); setSaveStatus("");
    const settings = { articleLayout: layout };
    try {
      if (tId) {
        const { error } = await supabase.from("newsletter_templates").update({
          name, blocks: blks, settings, updated_at: new Date().toISOString(),
        }).eq("id", tId);
        if (error) throw error;
        setSaveStatus("saved"); return tId;
      } else {
        const { data, error } = await supabase.from("newsletter_templates").insert({ name, blocks: blks, settings }).select("id").single();
        if (error || !data) throw error;
        currentTemplateId.current = data.id;
        const newUrl = returnTo
          ? `/admin/newsletter/template-editor?id=${data.id}&returnTo=${encodeURIComponent(returnTo)}`
          : `/admin/newsletter/template-editor?id=${data.id}`;
        router.replace(newUrl, { scroll: false });
        setSaveStatus("saved"); return data.id;
      }
    } catch { setSaveStatus("error"); return null; }
    finally { setSaving(false); }
  }, [supabase, router, returnTo]);

  function scheduleSave(name: string, blks: NewsletterBlock[], layout: ArticleLayout) {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveNow(name, blks, layout, currentTemplateId.current), 1500);
  }

  function handleSaveClick() {
    if (!currentTemplateId.current) {
      setShowNamePrompt(true);
    } else {
      saveNow(templateName, blocks, articleLayout, currentTemplateId.current);
    }
  }

  function handleNameConfirm(name: string) {
    setTemplateName(name);
    setShowNamePrompt(false);
    saveNow(name, blocks, articleLayout, currentTemplateId.current);
  }

  function addBlock(type: BlockType) { const nb = newBlock(type); const u = [...blocks, nb]; setBlocks(u); setSelectedBlockId(nb.id); scheduleSave(templateName, u, articleLayout); }
  function updateBlock(id: string, changes: Partial<NewsletterBlock>) { const u = blocks.map((b) => b.id === id ? { ...b, ...changes } : b); setBlocks(u); scheduleSave(templateName, u, articleLayout); }
  function deleteBlock(id: string) { const u = blocks.filter((b) => b.id !== id); setBlocks(u); setSelectedBlockId(null); scheduleSave(templateName, u, articleLayout); }
  function moveBlock(i: number, dir: "up" | "down") { const nb = [...blocks]; const t = dir === "up" ? i - 1 : i + 1; if (t < 0 || t >= nb.length) return; [nb[i], nb[t]] = [nb[t], nb[i]]; setBlocks(nb); scheduleSave(templateName, nb, articleLayout); }
  function handleDragStart(e: React.DragEvent, i: number) { dragIndexRef.current = i; e.dataTransfer.effectAllowed = "move"; }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault(); const from = dragIndexRef.current;
    if (from === null || from === dropIdx) return;
    const nb = [...blocks]; const [m] = nb.splice(from, 1); nb.splice(dropIdx, 0, m);
    setBlocks(nb); dragIndexRef.current = null; scheduleSave(templateName, nb, articleLayout);
  }
  function handleAdPick(ad: { id: string; title: string | null; image_url: string; link_url: string }) {
    if (!selectedBlockId) return;
    updateBlock(selectedBlockId, { adId: ad.id, adImageUrl: ad.image_url, adLinkUrl: ad.link_url, adTitle: ad.title || undefined });
    setShowAdPicker(false);
  }

  function handleArticlePick(article: Article) {
    if (!selectedBlockId) return;
    const section = (article.sections?.filter((s) => s !== "hero")[0] || article.section || "");
    const excerptPlain = (article.excerpt || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
    updateBlock(selectedBlockId, {
      articleId: article.id,
      articleTitle: article.title,
      articleExcerpt: excerptPlain,
      articleImageUrl: article.image_url || "",
      articleSlug: article.slug,
      articleSection: section,
      articleIsAdvertisement: article.is_advertisement === true,
    });
    setShowArticlePicker(false);
  }
  function handleLayoutChange(layout: ArticleLayout) {
    setArticleLayout(layout);
    scheduleSave(templateName, blocks, layout);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  const topBarBtn =
    "text-sm transition flex-shrink-0 inline-flex items-center gap-1.5 border border-[var(--admin-border)] rounded-lg px-3 py-1.5 font-semibold text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-table-header-bg)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent";
  const backArrowIcon = (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  return (
    <>
      <AdminPageHeader title="Template Editor" />
      <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* TOP BAR */}
      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap mb-4">
        {returnTo && (
          <button
            type="button"
            onClick={() => router.push(decodeURIComponent(returnTo))}
            className={topBarBtn}
          >
            {backArrowIcon}
            Campaign
          </button>
        )}
        <button type="button" onClick={() => router.push("/admin/newsletter")} className={topBarBtn}>
          {backArrowIcon}
          Newsletter
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-[12rem]">
          <span className="text-sm font-medium text-[var(--admin-text-muted)] shrink-0">Title:</span>
          <input
            type="text"
            value={templateName}
            onChange={(e) => {
              setTemplateName(e.target.value);
              scheduleSave(e.target.value, blocks, articleLayout);
            }}
            placeholder="Template name"
            className="text-sm font-semibold text-[var(--admin-text)] bg-transparent border-0 border-b border-transparent focus:border-[var(--admin-border)] focus:outline-none focus:ring-0 flex-1 min-w-0 py-0.5"
            aria-label="Template title"
          />
        </div>
        {saveStatus === "saved" && <span className="text-xs text-green-400 font-medium shrink-0">✓ Saved</span>}
        {saveStatus === "error" && <span className="text-xs text-red-400 font-medium shrink-0">Save failed</span>}
        <button type="button" onClick={() => setShowPreview(true)} className={topBarBtn}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview
        </button>
        <button type="button" onClick={handleSaveClick} disabled={saving} className={topBarBtn}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l3 3m0 0l-3 3m3-3H12" />
          </svg>
          {saving ? "Saving…" : "Save Template"}
        </button>
      </div>

      {/* 3-COL LAYOUT */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* LEFT: Palette */}
        <div className="w-48 flex-shrink-0 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-lg p-3 overflow-y-auto">
          <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-widest mb-3 px-1">Add Block</p>
          <div className="space-y-1">
            {BLOCK_TYPES.map((bt) => (
              <button key={bt.type} onClick={() => addBlock(bt.type)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--admin-accent)]/10 hover:text-[var(--admin-accent)] text-left transition group">
                <span className="w-7 h-7 flex-shrink-0 rounded-lg bg-[var(--admin-table-header-bg)] group-hover:bg-[var(--admin-accent)]/20 flex items-center justify-center text-sm font-semibold transition">{bt.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent)] transition">{bt.label}</p>
                  <p className="text-[10px] text-[var(--admin-text-muted)] leading-tight">{bt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Block list + iframe preview (matches buildEmailHtml / sent email) */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden p-4 bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)] rounded-lg">
          <div className="flex-shrink-0 flex flex-col min-h-0 max-h-[42vh]">
            <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-widest mb-2 px-1">Blocks</p>
            <div className="overflow-y-auto pr-1 space-y-1.5">
              {blocks.length === 0 ? (
                <div className="py-10 text-center rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-card-bg)]">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm font-semibold text-[var(--admin-text)] mb-0.5">No blocks yet</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">Add a block from the left panel.</p>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    total={blocks.length}
                    selected={selectedBlockId === block.id}
                    onSelect={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                    onMoveUp={() => moveBlock(index, "up")}
                    onMoveDown={() => moveBlock(index, "down")}
                    onDelete={() => deleteBlock(block.id)}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  />
                ))
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0 border-t border-[var(--admin-border)] pt-3">
            <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-widest mb-2 px-1">Preview as sent</p>
            <div className="flex-1 min-h-[280px] rounded-lg overflow-hidden border border-[#e0e3e8] bg-[#f0f2f4] shadow-inner">
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                className="w-full h-full min-h-[280px] bg-[#f0f2f4]"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Block settings / Template settings */}
        <div className="w-72 flex-shrink-0 bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-lg flex flex-col overflow-hidden">
          {selectedBlock ? (
            <>
              <div className="px-5 py-4 border-b border-[var(--admin-border)] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{BLOCK_TYPES.find((b) => b.type === selectedBlock.type)?.label} Settings</h3>
                <button onClick={() => setSelectedBlockId(null)} className="w-6 h-6 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <BlockEditor block={selectedBlock} onChange={(c) => updateBlock(selectedBlock.id, c)} onPickArticle={() => setShowArticlePicker(true)} onPickAd={() => setShowAdPicker(true)} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Template-level settings */}
              <div>
                <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-widest mb-3">Template Settings</p>
                <div>
                  <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-2">Article layout</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LAYOUT_OPTIONS.filter((o) => articleCount === 0 || articleCount >= o.min).map((o) => (
                      <button key={o.v} onClick={() => handleLayoutChange(o.v)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 text-xs font-semibold transition ${
                          articleLayout === o.v
                            ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]"
                            : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]/50"
                        }`}>
                        {o.icon}
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {articleCount === 0 && <p className="text-[10px] text-[var(--admin-text-muted)] mt-2">Add article blocks to preview layouts.</p>}
                  {articleCount === 1 && <p className="text-[10px] text-[var(--admin-text-muted)] mt-2">Add 2+ articles to use multi-column layouts.</p>}
                </div>
              </div>
              <div className="border-t border-[var(--admin-border)] pt-4">
                <div className="w-12 h-12 bg-[var(--admin-table-header-bg)] rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <svg className="w-6 h-6 text-[var(--admin-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
                <p className="text-sm font-semibold text-white mb-1 text-center">Block Settings</p>
                <p className="text-xs text-[var(--admin-text-muted)] text-center">Select a block on the canvas to edit its content.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showArticlePicker && <ArticlePickerModal onSelect={handleArticlePick} onClose={() => setShowArticlePicker(false)} />}
      {showAdPicker && <AdPickerModal onSelect={handleAdPick} onClose={() => setShowAdPicker(false)} />}
      {showPreview && <PreviewModal html={previewHtml} onClose={() => setShowPreview(false)} />}
      {showNamePrompt && <NamePromptModal defaultName={templateName === "New Template" ? "" : templateName} onConfirm={handleNameConfirm} onCancel={() => setShowNamePrompt(false)} />}
    </div>
    </>
  );
}

export default function TemplateEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
        </div>
      }
    >
      <TemplateEditorInner />
    </Suspense>
  );
}
