"use client";

import { useState } from "react";
import type { TenantRow } from "@/lib/types/database";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type SectionRow = { slug: string; label: string };

function emptySection(): SectionRow {
  return { slug: "", label: "" };
}

export function TenantForm({
  mode,
  initial,
  onCancel,
  onCreated,
  onUpdated,
  titleOverride,
  showCancel = true,
}: {
  mode: "create" | "edit";
  initial: TenantRow | null;
  onCancel: () => void;
  onCreated: (tenant: TenantRow) => void;
  onUpdated: (tenant: TenantRow) => void;
  /** e.g. "Tenant configuration" on detail page */
  titleOverride?: string;
  showCancel?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [fromEmail, setFromEmail] = useState(
    initial?.from_email ?? "admin@dpjmedia.com",
  );
  const [fromName, setFromName] = useState(initial?.from_name ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  const [sections, setSections] = useState<SectionRow[]>(() => {
    const sc = initial?.section_config;
    if (Array.isArray(sc) && sc.length > 0) {
      return sc.map((r: unknown) => {
        const o = r as Record<string, unknown>;
        return { slug: String(o.slug ?? ""), label: String(o.label ?? "") };
      });
    }
    return [emptySection()];
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSlugInput = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const addSection = () => setSections((s) => [...s, emptySection()]);
  const removeSection = (i: number) =>
    setSections((s) => (s.length <= 1 ? s : s.filter((_, j) => j !== i)));
  const setSection = (i: number, field: keyof SectionRow, v: string) => {
    setSections((rows) =>
      rows.map((row, j) =>
        j === i
          ? {
              ...row,
              [field]:
                field === "slug"
                  ? v.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  : v,
            }
          : row,
      ),
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const section_config = sections.map((r) => ({
      slug: r.slug.trim(),
      label: r.label.trim(),
    }));
    for (const r of section_config) {
      if (!r.slug || !r.label || !SLUG_RE.test(r.slug)) {
        setError("Each section needs a valid slug (lowercase, hyphens) and a label.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/admin/tenants", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
            domain: domain.trim(),
            from_email: fromEmail.trim(),
            from_name: fromName.trim(),
            section_config,
            is_active: isActive,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Could not create tenant.");
          return;
        }
        onCreated(j.tenant as TenantRow);
      } else if (initial) {
        const res = await fetch(`/api/admin/tenants/${initial.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            domain: domain.trim(),
            from_email: fromEmail.trim(),
            from_name: fromName.trim(),
            section_config,
            is_active: isActive,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Could not update tenant.");
          return;
        }
        onUpdated(j.tenant as TenantRow);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const heading =
    titleOverride ??
    (mode === "create" ? "New tenant" : "Edit tenant");

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white m-0">{heading}</h2>
        {showCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {error && (
        <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Site name *
          </span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
        </label>

        {mode === "create" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
              Slug *
            </span>
            <input
              required
              value={slug}
              onChange={(e) => handleSlugInput(e.target.value)}
              placeholder="e.g. my-site"
              className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
            />
          </label>
        ) : (
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
              Slug
            </span>
            <p className="m-0 rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text-muted)]">
              {initial?.slug}
            </p>
          </div>
        )}

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Domain * <span className="font-normal normal-case">(no https or www)</span>
          </span>
          <input
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            From email *
          </span>
          <input
            required
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            From name *
          </span>
          <input
            required
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
        </label>

        <div className="flex items-center gap-3 sm:col-span-2">
          <input
            id="tenant-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-[var(--admin-accent)]"
          />
          <label htmlFor="tenant-active" className="text-sm text-[var(--admin-text)]">
            Active
          </label>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Sections * (min 1)
          </span>
          <button
            type="button"
            onClick={addSection}
            className="text-sm font-semibold text-[var(--admin-accent)] hover:underline"
          >
            + Add section
          </button>
        </div>
        <div className="space-y-2">
          {sections.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-2 sm:items-end">
              <label className="min-w-[8rem] flex-1">
                <span className="mb-0.5 block text-[10px] font-semibold uppercase text-[var(--admin-text-muted)]">
                  Slug
                </span>
                <input
                  value={row.slug}
                  onChange={(e) => setSection(i, "slug", e.target.value)}
                  placeholder="news"
                  className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
                />
              </label>
              <label className="min-w-[10rem] flex-[2]">
                <span className="mb-0.5 block text-[10px] font-semibold uppercase text-[var(--admin-text-muted)]">
                  Label
                </span>
                <input
                  value={row.label}
                  onChange={(e) => setSection(i, "label", e.target.value)}
                  placeholder="News"
                  className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
                />
              </label>
              <button
                type="button"
                disabled={sections.length <= 1}
                onClick={() => removeSection(i)}
                className="rounded-md border border-[var(--admin-border)] px-2 py-1.5 text-sm text-red-400 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create tenant" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
