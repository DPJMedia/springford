"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SuggestionItem = { label: string; query: string };

type SearchDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  /** When "right", dropdown aligns its right edge with the anchor and extends left (avoids cutting off on the right). */
  align?: "left" | "right";
};

export function SearchDropdown({ isOpen, onClose, anchorRef, align = "left" }: SearchDropdownProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSuggestions([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && containerRef.current && !containerRef.current.contains(target) && anchorRef.current && !anchorRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Debounced fetch for suggestions
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = (e.target as HTMLFormElement).query?.value?.trim();
    if (!q) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSuggestionClick = (item: SuggestionItem) => {
    onClose();
    router.push(`/search?q=${encodeURIComponent(item.query)}`);
  };

  if (!isOpen) return null;

  const positionClasses = align === "right" ? "right-0 left-auto" : "left-0";

  return (
    <div
      ref={containerRef}
      className={`absolute ${positionClasses} top-full mt-2 z-50 w-80 sm:w-96 min-w-[20rem]`}
      role="search"
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[color:var(--color-border)] bg-white shadow-xl ring-1 ring-black/10 overflow-hidden"
      >
        <div className="flex items-stretch">
          <label htmlFor="header-search-query" className="sr-only">
            Search
          </label>
          <input
            ref={inputRef}
            id="header-search-query"
            type="search"
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, sections..."
            className="flex-1 min-w-0 px-4 py-3 text-base text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:outline-none bg-gray-50/50 focus:bg-white border-0 rounded-l-xl transition-colors"
            autoComplete="off"
          />
          <button
            type="submit"
            className="flex-shrink-0 px-4 bg-[color:var(--color-riviera-blue)] text-white hover:opacity-90 transition-opacity rounded-r-xl font-semibold text-sm flex items-center gap-2"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </button>
        </div>
      </form>

      {/* Suggestions (1–3 items): sections, article titles, tags */}
      {suggestions.length > 0 && (
        <ul
          className="mt-1 rounded-lg border border-[color:var(--color-border)] bg-white shadow-lg ring-1 ring-black/10 overflow-hidden"
          role="listbox"
        >
          {suggestions.map((item, i) => (
            <li key={`${item.query}-${i}`} role="option">
              <button
                type="button"
                onClick={() => handleSuggestionClick(item)}
                className="w-full text-left px-4 py-3 text-sm text-[color:var(--color-dark)] hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {suggestionsLoading && query.trim() && suggestions.length === 0 && (
        <p className="mt-1 px-4 py-2 text-xs text-[color:var(--color-medium)]">Finding suggestions...</p>
      )}
    </div>
  );
}
