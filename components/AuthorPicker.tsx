"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/TenantProvider";
import type { AuthorRow } from "@/lib/types/database";

type Props = {
  /** Selected author id (FK to authors.id). Null = free-text byline. */
  authorId: string | null;
  /** Display name (always written; used for legacy display + free text). */
  authorName: string;
  onChange: (next: { authorId: string | null; authorName: string }) => void;
  /** Optional label override (defaults to "Author *"). */
  label?: string;
};

/**
 * Picker for the new `authors` table, scoped to the current tenant.
 * Selecting an author sets both the FK id and the cached name.
 * Free-text input (no selection) is preserved for special bylines like
 * "Powered by diffuse.ai" or advertiser names.
 */
export function AuthorPicker({
  authorId,
  authorName,
  onChange,
  label = "Author *",
}: Props) {
  const tenant = useTenant();
  const supabase = createClient();
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(authorName);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep the input value in sync when the parent changes (e.g. swap to "Powered by diffuse.ai")
  useEffect(() => {
    setQuery(authorName);
  }, [authorName]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // Read authors for the current tenant. RLS allows public reads.
      const { data: pairs } = await supabase
        .from("author_tenants")
        .select("author_id")
        .eq("tenant_id", tenant.id);
      const ids = (pairs ?? []).map((r: { author_id: string }) => r.author_id);
      if (ids.length === 0) {
        if (alive) {
          setAuthors([]);
          setLoading(false);
        }
        return;
      }
      const { data: rows } = await supabase
        .from("authors")
        .select("*")
        .in("id", ids)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (alive) {
        setAuthors((rows ?? []) as AuthorRow[]);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, tenant.id]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.title ?? "").toLowerCase().includes(q),
    );
  }, [authors, query]);

  const selectedAuthor =
    authors.find((a) => a.id === authorId) ??
    authors.find((a) => a.name.toLowerCase() === query.trim().toLowerCase()) ??
    null;

  function pick(a: AuthorRow) {
    onChange({ authorId: a.id, authorName: a.name });
    setQuery(a.name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const choice = filtered[activeIndex];
      if (choice) pick(choice);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          {selectedAuthor?.avatar_url ? (
            <img
              src={selectedAuthor.avatar_url}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : selectedAuthor ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] text-[10px] font-bold text-white">
              {initials(selectedAuthor.name)}
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-[10px] text-gray-600">
              ?
            </div>
          )}
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            setActiveIndex(0);
            // If the typed value no longer matches the selected author, clear the FK.
            const match = authors.find(
              (a) => a.name.toLowerCase() === v.trim().toLowerCase(),
            );
            onChange({ authorId: match?.id ?? null, authorName: v });
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-4 py-2 pl-11 text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
          placeholder={loading ? "Loading authors…" : "Select or type a byline…"}
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] shadow-xl">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--admin-text-muted)]">
                {authors.length === 0
                  ? "No authors for this site yet. Create one in Authors."
                  : "No matches. The current text will be used as the byline."}
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {filtered.map((a, i) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(a)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                        i === activeIndex
                          ? "bg-[var(--admin-table-row-hover)]"
                          : "hover:bg-[var(--admin-table-row-hover)]"
                      }`}
                    >
                      {a.avatar_url ? (
                        <img
                          src={a.avatar_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] text-xs font-bold text-white">
                          {initials(a.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[var(--admin-text)]">
                          {a.name}
                        </div>
                        {a.title && (
                          <div className="truncate text-xs text-[var(--admin-text-muted)]">
                            {a.title}
                          </div>
                        )}
                      </div>
                      {a.id === authorId && (
                        <span className="text-[var(--admin-accent)]">✓</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-[11px] text-[var(--admin-text-muted)]">
              Tip — type any text to use a custom byline (e.g. an advertiser name).
            </div>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
        Pick a managed author to link to their profile page, or type any name for one-off bylines.
      </p>
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
