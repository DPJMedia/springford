"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { NewsletterBlock, BlockType, Alignment, ArticleLayout } from "@/lib/newsletter/buildEmailHtml";
import { buildEmailHtml } from "@/lib/newsletter/buildEmailHtml";

// ─── Types / Helpers ──────────────────────────────────────────────────────────

interface Article {
  id: string; title: string; slug: string; excerpt: string | null;
  image_url: string | null; section: string; sections: string[]; published_at: string | null;
}

function newBlock(type: BlockType): NewsletterBlock {
  const id = `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case "hero_text": return { id, type, headline: "This Week in Spring Ford", subheadline: "", introText: "", alignment: "left" };
    case "article":   return { id, type, articleTitle: "", articleExcerpt: "", articleImageUrl: "", articleSlug: "", articleSection: "" };
    case "text":      return { id, type, textTitle: "", textBody: "", alignment: "left" };
    case "image":     return { id, type, imageUrl: "", imageLink: "", imageAlt: "" };
    case "button":    return { id, type, buttonText: "Read More", buttonLink: "https://www.springford.press", buttonColor: "#2b8aa8", alignment: "center" };
    case "divider":   return { id, type };
    case "spacer":    return { id, type, spacerHeight: 24 };
    default:          return { id, type };
  }
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: string; desc: string }[] = [
  { type: "hero_text", label: "Headline", icon: "H",  desc: "Big headline + intro" },
  { type: "article",   label: "Article",  icon: "📰", desc: "Pick a site article" },
  { type: "text",      label: "Text",     icon: "T",  desc: "Title + body paragraph" },
  { type: "image",     label: "Image",    icon: "🖼", desc: "Image with optional link" },
  { type: "button",    label: "Button",   icon: "→",  desc: "CTA button" },
  { type: "divider",   label: "Divider",  icon: "—",  desc: "Horizontal rule" },
  { type: "spacer",    label: "Spacer",   icon: "⬜", desc: "Blank space" },
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
    `w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition border ${
      active ? "bg-[color:var(--color-riviera-blue)] text-white border-[color:var(--color-riviera-blue)]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
    }`;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[color:var(--color-riviera-blue)] focus-within:border-transparent transition">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2.5 py-2 bg-gray-50 border-b border-gray-200">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt("bold"); }} className={toolBtn(activeFmt.bold)} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt("italic"); }} className={toolBtn(activeFmt.italic)} title="Italic (Ctrl+I)"><em>I</em></button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <select
          onChange={(e) => { if (e.target.value) applyFontSize(e.target.value); e.target.value = ""; }}
          defaultValue=""
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
          title="Font size">
          <option value="" disabled>Size</option>
          {FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt("removeFormat"); }} className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 transition px-1.5 py-0.5 rounded border border-transparent hover:border-gray-200" title="Clear formatting">Clear</button>
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
        className="min-h-[120px] p-3 text-sm text-[color:var(--color-dark)] focus:outline-none"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[color:var(--color-dark)]">Name your template</h2>
          <p className="text-sm text-[color:var(--color-medium)] mt-0.5">Give this template a descriptive name.</p>
        </div>
        <div className="px-6 py-5">
          <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Newsletter Layout"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); if (e.key === "Escape") onCancel(); }} />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button onClick={() => name.trim() && onConfirm(name.trim())} disabled={!name.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-[color:var(--color-riviera-blue)] text-white rounded-xl hover:opacity-90 transition disabled:opacity-40">
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
              ? "border-[color:var(--color-riviera-blue)] bg-blue-50 text-[color:var(--color-riviera-blue)]"
              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
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
    supabase.from("articles").select("id,title,slug,excerpt,image_url,section,sections,published_at")
      .eq("status", "published").order("published_at", { ascending: false }).limit(60)
      .then(({ data }) => { setArticles(data || []); setLoading(false); });
  }, [supabase]);
  const filtered = articles.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[color:var(--color-dark)]">Pick an Article</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition">✕</button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100">
          <input type="text" placeholder="Search articles…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]" autoFocus />
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          {loading ? <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--color-riviera-blue)] border-r-transparent" /></div>
          : filtered.length === 0 ? <p className="text-center text-[color:var(--color-medium)] py-8 text-sm">No articles found.</p>
          : filtered.map((article) => (
            <button key={article.id} onClick={() => onSelect(article)}
              className="w-full text-left flex gap-3 p-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition group">
              {article.image_url
                ? <img src={article.image_url} alt={article.title} className="w-20 h-14 object-cover rounded-lg flex-shrink-0" />
                : <div className="w-20 h-14 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-300 text-xl">📰</div>}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[color:var(--color-riviera-blue)] uppercase tracking-wide mb-0.5">
                  {(article.sections?.filter((s) => s !== "hero")[0] || article.section || "").replace(/-/g, " ")}
                </p>
                <p className="text-sm font-semibold text-[color:var(--color-dark)] line-clamp-2 group-hover:text-[color:var(--color-riviera-blue)] transition">{article.title}</p>
                {article.published_at && <p className="text-xs text-gray-400 mt-0.5">{new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Block Editor Panel ───────────────────────────────────────────────────────

function BlockEditor({ block, onChange, onPickArticle }: {
  block: NewsletterBlock; onChange: (u: Partial<NewsletterBlock>) => void; onPickArticle: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const inp = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)] focus:border-transparent";
  const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";
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
      <div className={field}><label className={lbl}>Sub-headline <span className="font-normal normal-case text-gray-400">(optional)</span></label><input className={inp} value={block.subheadline || ""} onChange={(e) => onChange({ subheadline: e.target.value })} /></div>
      <div className={field}><label className={lbl}>Intro paragraph</label><textarea className={`${inp} resize-none`} rows={4} value={block.introText || ""} onChange={(e) => onChange({ introText: e.target.value })} /></div>
    </div>
  );

  if (block.type === "article") return (
    <div>
      <div className={field}>
        <button onClick={onPickArticle} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border-2 border-dashed border-[color:var(--color-riviera-blue)] text-[color:var(--color-riviera-blue)] rounded-xl font-semibold text-sm hover:bg-blue-100 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {block.articleTitle ? "Change Article" : "Pick Article from Site"}
        </button>
      </div>
      {block.articleTitle && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4">
          {block.articleImageUrl && <img src={block.articleImageUrl} alt={block.articleTitle} className="w-full h-24 object-cover rounded-lg mb-2" />}
          <p className="text-sm font-semibold text-[color:var(--color-dark)] line-clamp-2">{block.articleTitle}</p>
        </div>
      )}
      <div className={field}><label className={lbl}>Excerpt override</label><textarea className={`${inp} resize-none`} rows={3} value={block.articleExcerpt || ""} onChange={(e) => onChange({ articleExcerpt: e.target.value })} placeholder="Leave blank to use article excerpt" /></div>
    </div>
  );

  if (block.type === "text") return (
    <div>
      <div className={field}><label className={lbl}>Alignment</label><AlignPicker value={block.alignment} onChange={(a) => onChange({ alignment: a })} /></div>
      <div className={field}><label className={lbl}>Title <span className="font-normal normal-case text-gray-400">(optional)</span></label><input className={inp} value={block.textTitle || ""} onChange={(e) => onChange({ textTitle: e.target.value })} /></div>
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
          className={`relative w-full border-2 border-dashed rounded-xl transition cursor-pointer ${uploading ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-[color:var(--color-riviera-blue)] hover:bg-blue-50"}`}
          style={{ minHeight: block.imageUrl ? undefined : "96px" }}>
          {block.imageUrl
            ? <div className="relative"><img src={block.imageUrl} alt="preview" className="w-full rounded-lg object-cover max-h-40" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition rounded-lg flex items-center justify-center"><span className="text-white text-xs font-semibold">Click or drop to replace</span></div></div>
            : <div className="flex flex-col items-center justify-center py-6 px-4 text-center">{uploading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--color-riviera-blue)] border-r-transparent" /> : <><svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p className="text-xs font-semibold text-[color:var(--color-medium)]">Drop image here or click to upload</p><p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP</p></>}</div>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
      </div>
      <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Recommended sizes</p>
        <div className="flex items-start gap-2"><span className="text-[10px] font-semibold bg-[color:var(--color-riviera-blue)] text-white px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Banner</span><p className="text-xs text-gray-500 leading-snug"><strong className="text-gray-700">600 × 200 px</strong> — Wide thin banner. Ratio 3:1.</p></div>
        <div className="flex items-start gap-2"><span className="text-[10px] font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Feature</span><p className="text-xs text-gray-500 leading-snug"><strong className="text-gray-700">600 × 340 px</strong> — Feature photo or infographic. Ratio 16:9.</p></div>
      </div>
      <div className={field}><label className={lbl}>— or paste image URL —</label><input className={inp} value={block.imageUrl || ""} onChange={(e) => onChange({ imageUrl: e.target.value })} placeholder="https://…" /></div>
      <div className={field}><label className={lbl}>Link URL <span className="font-normal normal-case text-gray-400">(optional)</span></label><input className={inp} value={block.imageLink || ""} onChange={(e) => onChange({ imageLink: e.target.value })} placeholder="https://…" /></div>
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
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition ${block.buttonText === preset.label && block.buttonLink === preset.link ? "border-[color:var(--color-riviera-blue)] bg-blue-50 text-[color:var(--color-riviera-blue)]" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}>
              <span>{preset.label}</span>
              <span className="text-[10px] font-normal text-gray-400 truncate max-w-[110px]">{preset.link.replace("https://www.springford.press", "") || "/"}</span>
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
          <input type="color" value={block.buttonColor || "#2b8aa8"} onChange={(e) => onChange({ buttonColor: e.target.value })} className="h-9 w-16 rounded cursor-pointer border border-gray-200" />
          <input className={`${inp} flex-1`} value={block.buttonColor || "#2b8aa8"} onChange={(e) => onChange({ buttonColor: e.target.value })} />
        </div>
      </div>
    </div>
  );

  if (block.type === "spacer") return (
    <div className={field}><label className={lbl}>Height (px)</label><input type="number" className={inp} value={block.spacerHeight ?? 24} min={8} max={120} onChange={(e) => onChange({ spacerHeight: parseInt(e.target.value) || 24 })} /></div>
  );

  return <p className="text-sm text-[color:var(--color-medium)]">No settings for this block.</p>;
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
      case "button":    return `"${block.buttonText || "Button"}" → ${block.buttonLink || "(no link)"}`;
      case "divider":   return "──────────────";
      case "spacer":    return `${block.spacerHeight || 24}px space`;
      default:          return block.type;
    }
  }
  return (
    <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onClick={onSelect}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${selected ? "border-[color:var(--color-riviera-blue)] bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"}`}>
      <div className="flex-shrink-0 text-gray-300 cursor-grab hover:text-gray-500 transition" title="Drag to reorder">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 0a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM7 7a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1zm-4 5a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm4 0a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" /></svg>
      </div>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${selected ? "bg-[color:var(--color-riviera-blue)] text-white" : "bg-gray-100 text-gray-600"}`}>{typeInfo?.icon || "?"}</div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-[color:var(--color-riviera-blue)] uppercase tracking-wide">{typeInfo?.label}</span>
        <p className="text-sm text-[color:var(--color-dark)] truncate">{getPreview()}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={onMoveUp} disabled={index === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg></button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-white font-semibold text-sm">Template Preview</h2>
        <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition">Close</button>
      </div>
      <div className="flex-1 overflow-auto p-6 flex justify-center">
        <div className="w-full max-w-2xl">
          <iframe srcDoc={html} title="Template preview" className="w-full rounded-xl border border-gray-700 bg-white" style={{ height: "80vh" }} sandbox="allow-same-origin" />
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
      if (!p?.is_admin && !p?.is_super_admin) { router.push("/admin"); return; }
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
  function handleArticlePick(article: Article) {
    if (!selectedBlockId) return;
    const section = (article.sections?.filter((s) => s !== "hero")[0] || article.section || "");
    const excerptPlain = (article.excerpt || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
    updateBlock(selectedBlockId, { articleId: article.id, articleTitle: article.title, articleExcerpt: excerptPlain, articleImageUrl: article.image_url || "", articleSlug: article.slug, articleSection: section });
    setShowArticlePicker(false);
  }
  function handleLayoutChange(layout: ArticleLayout) {
    setArticleLayout(layout);
    scheduleSave(templateName, blocks, layout);
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        {returnTo ? (
          <button onClick={() => router.push(decodeURIComponent(returnTo))}
            className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition flex-shrink-0 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Campaign
          </button>
        ) : (
          <Link href="/admin/newsletter" className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition flex-shrink-0">← Newsletter</Link>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <span className="text-xs font-semibold text-[color:var(--color-riviera-blue)] uppercase tracking-wide">Template</span>
        </div>
        <input type="text" value={templateName}
          onChange={(e) => { setTemplateName(e.target.value); scheduleSave(e.target.value, blocks, articleLayout); }}
          placeholder="Template name"
          className="text-base font-semibold text-[color:var(--color-dark)] bg-transparent border-0 focus:outline-none focus:ring-0 flex-1 min-w-0" />
        {saveStatus === "saved" && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
        {saveStatus === "error" && <span className="text-xs text-red-500 font-medium">Save failed</span>}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowPreview(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Preview
          </button>
          <button onClick={handleSaveClick} disabled={saving}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[color:var(--color-riviera-blue)] rounded-lg hover:opacity-90 transition disabled:opacity-50">
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      </div>

      {/* 3-COL LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Palette */}
        <div className="w-48 flex-shrink-0 bg-white border-r border-gray-200 p-3 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Add Block</p>
          <div className="space-y-1">
            {BLOCK_TYPES.map((bt) => (
              <button key={bt.type} onClick={() => addBlock(bt.type)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 hover:text-[color:var(--color-riviera-blue)] text-left transition group">
                <span className="w-7 h-7 flex-shrink-0 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-sm font-bold transition">{bt.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-[color:var(--color-dark)] group-hover:text-[color:var(--color-riviera-blue)] transition">{bt.label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{bt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-xl mx-auto mb-0 bg-white border-2 border-b-0 border-gray-200 rounded-t-xl overflow-hidden">
            <div className="text-center py-5 border-b-4 border-[#2b8aa8] bg-white">
              <div className="font-bold text-[#1a1a1a] text-2xl" style={{ fontFamily: "Georgia, serif" }}>Spring-Ford Press</div>
              <div className="text-[10px] tracking-widest uppercase text-gray-400 mt-1 font-medium">Neighborhood-First Reporting</div>
            </div>
          </div>
          <div className="max-w-xl mx-auto border-x-2 border-gray-200">
            {blocks.length === 0
              ? <div className="py-16 text-center bg-white"><p className="text-3xl mb-3">📭</p><p className="text-sm font-semibold text-[color:var(--color-dark)] mb-1">No blocks yet</p><p className="text-xs text-[color:var(--color-medium)]">Click a block type on the left to add content.</p></div>
              : <div className="space-y-1.5 p-3 bg-white">
                  {blocks.map((block, index) => (
                    <BlockCard key={block.id} block={block} index={index} total={blocks.length}
                      selected={selectedBlockId === block.id}
                      onSelect={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                      onMoveUp={() => moveBlock(index, "up")} onMoveDown={() => moveBlock(index, "down")}
                      onDelete={() => deleteBlock(block.id)}
                      onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} />
                  ))}
                </div>}
          </div>
          <div className="max-w-xl mx-auto bg-[#1a1a1a] border-2 border-t-0 border-gray-200 rounded-b-xl overflow-hidden px-8 py-6 text-center">
            <div className="text-white font-bold text-base mb-3" style={{ fontFamily: "Georgia, serif" }}>Spring-Ford Press</div>
            <div className="text-xs text-gray-500">springford.press | Terms | Privacy | Contact</div>
            <p className="text-[11px] text-gray-600 mt-2">&copy; {new Date().getFullYear()} Spring-Ford Press. All rights reserved.</p>
          </div>
        </div>

        {/* RIGHT: Block settings / Template settings */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {selectedBlock ? (
            <>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[color:var(--color-dark)]">{BLOCK_TYPES.find((b) => b.type === selectedBlock.type)?.label} Settings</h3>
                <button onClick={() => setSelectedBlockId(null)} className="w-6 h-6 text-gray-400 hover:text-gray-600 transition">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <BlockEditor block={selectedBlock} onChange={(c) => updateBlock(selectedBlock.id, c)} onPickArticle={() => setShowArticlePicker(true)} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Template-level settings */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Template Settings</p>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Article layout</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LAYOUT_OPTIONS.filter((o) => articleCount === 0 || articleCount >= o.min).map((o) => (
                      <button key={o.v} onClick={() => handleLayoutChange(o.v)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition ${
                          articleLayout === o.v
                            ? "border-[color:var(--color-riviera-blue)] bg-blue-50 text-[color:var(--color-riviera-blue)]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}>
                        {o.icon}
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {articleCount === 0 && <p className="text-[10px] text-gray-400 mt-2">Add article blocks to preview layouts.</p>}
                  {articleCount === 1 && <p className="text-[10px] text-gray-400 mt-2">Add 2+ articles to use multi-column layouts.</p>}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
                <p className="text-sm font-semibold text-[color:var(--color-dark)] mb-1 text-center">Block Settings</p>
                <p className="text-xs text-[color:var(--color-medium)] text-center">Select a block on the canvas to edit its content.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showArticlePicker && <ArticlePickerModal onSelect={handleArticlePick} onClose={() => setShowArticlePicker(false)} />}
      {showPreview && <PreviewModal html={previewHtml} onClose={() => setShowPreview(false)} />}
      {showNamePrompt && <NamePromptModal defaultName={templateName === "New Template" ? "" : templateName} onConfirm={handleNameConfirm} onCancel={() => setShowNamePrompt(false)} />}
    </div>
  );
}

export default function TemplateEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" /></div>}>
      <TemplateEditorInner />
    </Suspense>
  );
}
