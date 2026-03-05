"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SuggestionItem = {
  label: string;
  query: string;
  type: "section" | "article" | "tag";
  slug?: string;
  imageUrl?: string;
};

type SearchDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SearchDropdown({ isOpen, onClose }: SearchDropdownProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollAtOpen = useRef(0);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on open; clear on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
      setSuggestions([]);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [isOpen, onClose]);

  // Click outside to close (ignore the search toggle button)
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!isOpen) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-search-toggle]")) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen, onClose]);

  // Scroll away to close
  useEffect(() => {
    if (!isOpen) return;
    scrollAtOpen.current = window.scrollY;
    const handle = () => {
      if (Math.abs(window.scrollY - scrollAtOpen.current) > 60) onClose();
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, [isOpen, onClose]);

  // Debounced suggestions fetch
  useEffect(() => {
    const q = query.trim();
    if (!q) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  // Not open → render nothing; the header collapses back to its normal height
  if (!isOpen) return null;

  return (
    /*
     * wrapperRef is position:relative so the results dropdown can anchor to
     * its bottom edge. The wrapper itself only ever has the height of the
     * input row — results float over the page content below via position:absolute.
     */
    <div
      ref={wrapperRef}
      className="relative border-b border-[color:var(--color-border)] bg-white"
      style={{ animation: "sfp-search-open 0.2s ease both" }}
    >
      <style>{`
        @keyframes sfp-search-open {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* ── Input row — fixed height, never changes ── */}
      <div className="px-3 sm:px-6 lg:px-8 py-3 xl:flex xl:justify-center">
        <form onSubmit={handleSubmit} className="w-full xl:max-w-2xl">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-medium)] pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles, sections…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[color:var(--color-border)] rounded-full bg-gray-50 focus:bg-white focus:outline-none text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] transition"
              autoComplete="off"
            />
          </div>
        </form>
      </div>

      {/* ── Results dropdown — floats over page content, never expands the bar ── */}
      {(suggestions.length > 0 || (loading && query.trim().length > 0)) && (
        <div className="absolute top-full left-0 right-0 z-50 px-3 sm:px-6 lg:px-8 pt-1 xl:flex xl:justify-center pointer-events-none">
          <div className="w-full xl:max-w-2xl bg-white rounded-xl border border-[color:var(--color-border)] shadow-lg overflow-hidden pointer-events-auto">
            {loading && suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[color:var(--color-medium)]">Searching…</div>
            ) : (
              <ul role="listbox">
                {suggestions.map((item, i) => (
                  <li key={`${item.query}-${i}`} role="option" className="border-b border-gray-50 last:border-b-0">
                    {item.type === "article" && item.slug ? (
                      <Link
                        href={`/articles/${item.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition"
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-14 h-10 rounded-md object-cover flex-shrink-0 bg-gray-100" />
                        ) : (
                          <div className="w-14 h-10 rounded-md bg-gray-100 flex-shrink-0 flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <span className="text-sm text-[color:var(--color-dark)] line-clamp-2 leading-snug">{item.label}</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { onClose(); router.push(`/search?q=${encodeURIComponent(item.query)}`); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left"
                      >
                        <div className="w-14 h-10 rounded-md bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-sm text-[color:var(--color-dark)]">{item.label}</span>
                          {item.type === "section" && <span className="block text-xs text-[color:var(--color-medium)]">Section</span>}
                          {item.type === "tag"     && <span className="block text-xs text-[color:var(--color-medium)]">Topic</span>}
                        </div>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
