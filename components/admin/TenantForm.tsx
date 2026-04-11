"use client";

import { useEffect, useRef, useState } from "react";
import type { TenantRow } from "@/lib/types/database";
import {
  parseStoredSectionConfig,
  parseTenantFacebookUrl,
} from "@/lib/tenant/parseSectionConfig";
import {
  DEFAULT_TENANT_SECTIONS,
  deriveDomainFromSiteName,
  deriveSectionSlugFromLabel,
  deriveSlugFromSiteName,
} from "@/lib/tenant/tenantFormDerive";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type SectionRow = { slug: string; label: string };

function emptySection(): SectionRow {
  return { slug: "", label: "" };
}

const DEFAULT_FROM_EMAIL = "admin@dpjmedia.com";

/** Queued before tenant exists; persisted via POST .../members after tenant row is created. */
export type DraftTenantMember = {
  userId: string;
  email: string;
  full_name: string | null;
  role: "admin" | "editor";
};

type StaffPick = { id: string; full_name: string | null; email: string };

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
  titleOverride?: string;
  showCancel?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [fromEmail, setFromEmail] = useState(
    initial?.from_email ?? DEFAULT_FROM_EMAIL,
  );
  const [fromName, setFromName] = useState(initial?.from_name ?? "");
  const [facebookUrl, setFacebookUrl] = useState(() =>
    initial ? parseTenantFacebookUrl(initial) ?? "" : "",
  );
  const [isActive, setIsActive] = useState(initial?.is_active !== false);

  const [userTouchedSlug, setUserTouchedSlug] = useState(false);
  const [userTouchedDomain, setUserTouchedDomain] = useState(false);
  const [userTouchedFromName, setUserTouchedFromName] = useState(false);
  const [userTouchedFromEmail, setUserTouchedFromEmail] = useState(false);
  const [userTouchedFacebook, setUserTouchedFacebook] = useState(false);

  const [sections, setSections] = useState<SectionRow[]>(() => {
    if (mode === "create") {
      return DEFAULT_TENANT_SECTIONS.map((r) => ({ ...r }));
    }
    const sc = initial?.section_config;
    const parsed = parseStoredSectionConfig(sc);
    if (parsed.sections.length > 0) {
      return parsed.sections.map((r) => ({ slug: r.slug, label: r.label }));
    }
    return [emptySection()];
  });

  const [sectionSlugManual, setSectionSlugManual] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (mode !== "create") return;
    if (userTouchedSlug) return;
    setSlug(deriveSlugFromSiteName(name));
  }, [mode, name, userTouchedSlug]);

  useEffect(() => {
    if (mode !== "create") return;
    if (userTouchedDomain) return;
    setDomain(deriveDomainFromSiteName(name));
  }, [mode, name, userTouchedDomain]);

  useEffect(() => {
    if (mode !== "create") return;
    if (userTouchedFromName) return;
    setFromName(name);
  }, [mode, name, userTouchedFromName]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftMembers, setDraftMembers] = useState<DraftTenantMember[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StaffPick[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [picked, setPicked] = useState<StaffPick | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [draftRole, setDraftRole] = useState<"admin" | "editor">("editor");
  const [draftFormError, setDraftFormError] = useState<string | null>(null);
  const draftSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "create") return;
    function handlePointerDown(e: PointerEvent) {
      const el = draftSearchRef.current;
      if (el && !el.contains(e.target as Node)) setListOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [mode]);

  useEffect(() => {
    if (mode !== "create") return;
    if (picked) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const q = nameQuery.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/admin/staff-search?q=${encodeURIComponent(q)}`, {
          credentials: "include",
        });
        const j = (await res.json()) as { users?: StaffPick[] };
        const raw = Array.isArray(j.users) ? j.users : [];
        const exclude = new Set(draftMembers.map((d) => d.userId));
        setSearchResults(raw.filter((u) => !exclude.has(u.id)));
        setSearchLoading(false);
        setListOpen(true);
      })();
    }, 200);
    return () => clearTimeout(timer);
  }, [mode, nameQuery, picked, draftMembers]);

  const handleSlugInput = (v: string) => {
    setUserTouchedSlug(true);
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const addSection = () => {
    setSections((s) => [...s, emptySection()]);
  };

  const removeSection = (i: number) =>
    setSections((s) => (s.length <= 1 ? s : s.filter((_, j) => j !== i)));

  const setSectionLabel = (i: number, v: string) => {
    setSections((rows) =>
      rows.map((row, j) => {
        if (j !== i) return row;
        const manual = sectionSlugManual[i] === true;
        const nextLabel = v;
        const nextSlug = manual ? row.slug : deriveSectionSlugFromLabel(nextLabel);
        return { label: nextLabel, slug: nextSlug };
      }),
    );
  };

  const setSectionSlugInput = (i: number, v: string) => {
    setSectionSlugManual((m) => ({ ...m, [i]: true }));
    setSections((rows) =>
      rows.map((row, j) =>
        j === i
          ? {
              ...row,
              slug: v.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            }
          : row,
      ),
    );
  };

  function onDraftNameChange(v: string) {
    setNameQuery(v);
    setPicked(null);
    setDraftFormError(null);
  }

  function selectDraftStaff(u: StaffPick) {
    setPicked(u);
    setNameQuery(u.full_name?.trim() || u.email);
    setListOpen(false);
    setSearchResults([]);
  }

  function handleDraftAddClick() {
    setDraftFormError(null);
    if (!picked) {
      setDraftFormError("Select a user from the list.");
      return;
    }
    const emailLower = picked.email.trim().toLowerCase();
    if (draftMembers.some((d) => d.email.toLowerCase() === emailLower)) {
      setDraftFormError("That user is already in the list.");
      return;
    }
    setDraftMembers((prev) => [
      ...prev,
      {
        userId: picked.id,
        email: picked.email.trim(),
        full_name: picked.full_name,
        role: draftRole,
      },
    ]);
    setPicked(null);
    setNameQuery("");
    setDraftRole("editor");
  }

  function removeDraftMember(userId: string) {
    setDraftMembers((prev) => prev.filter((d) => d.userId !== userId));
  }

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
      const facebookPayload = facebookUrl.trim() || null;
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
            facebook_url: facebookPayload,
            is_active: isActive,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Could not create tenant.");
          return;
        }
        const tenant = j.tenant as TenantRow;
        if (draftMembers.length > 0) {
          const failures: string[] = [];
          for (const m of draftMembers) {
            const mr = await fetch(`/api/admin/tenants/${tenant.id}/members`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: m.email, role: m.role }),
            });
            if (!mr.ok) {
              if (mr.status === 409) continue;
              const ej = (await mr.json().catch(() => ({}))) as { error?: string };
              failures.push(`${m.email}: ${typeof ej.error === "string" ? ej.error : mr.status}`);
            }
          }
          if (failures.length > 0) {
            window.alert(
              `Tenant was created.\n\nSome members could not be added automatically (add them from the tenant page):\n\n${failures.join("\n")}`,
            );
          }
        }
        onCreated(tenant);
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
            facebook_url: facebookPayload,
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
            onChange={(e) => {
              setUserTouchedDomain(true);
              setDomain(e.target.value);
            }}
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
            onChange={(e) => {
              setUserTouchedFromEmail(true);
              setFromEmail(e.target.value);
            }}
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
            onChange={(e) => {
              setUserTouchedFromName(true);
              setFromName(e.target.value);
            }}
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Facebook page URL <span className="font-normal normal-case">(optional)</span>
          </span>
          <input
            type="url"
            value={facebookUrl}
            onChange={(e) => {
              setUserTouchedFacebook(true);
              setFacebookUrl(e.target.value);
            }}
            placeholder="https://www.facebook.com/..."
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
          <span className="mt-1 block text-[11px] text-[var(--admin-text-muted)]">
            Used for the &quot;Follow us on Facebook&quot; link in the site footer.
          </span>
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
              <label className="min-w-[10rem] flex-[2]">
                <span className="mb-0.5 block text-[10px] font-semibold uppercase text-[var(--admin-text-muted)]">
                  Label
                </span>
                <input
                  value={row.label}
                  onChange={(e) => setSectionLabel(i, e.target.value)}
                  placeholder="News"
                  className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
                />
              </label>
              <label className="min-w-[8rem] flex-1">
                <span className="mb-0.5 block text-[10px] font-semibold uppercase text-[var(--admin-text-muted)]">
                  Slug
                </span>
                <input
                  value={row.slug}
                  onChange={(e) => setSectionSlugInput(i, e.target.value)}
                  placeholder="news"
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

      {mode === "create" ? (
        <div className="border-t border-[var(--admin-border)] pt-6 space-y-4">
          <div>
            <h3 className="m-0 text-base font-semibold text-white">Members</h3>
            <p className="mt-1 mb-0 text-sm text-[var(--admin-text-muted)]">
              Add editors and admins now (saved when you create the tenant). Only accounts that already have platform
              admin access can be found — same as on an existing tenant&apos;s Members screen.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 border-b border-[var(--admin-border)] pb-6">
            <div ref={draftSearchRef} className="relative min-w-[12rem] flex-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Find user by name
              </span>
              <input
                type="text"
                autoComplete="off"
                value={nameQuery}
                onChange={(e) => onDraftNameChange(e.target.value)}
                onFocus={() => {
                  if (!picked && nameQuery.trim().length > 0) setListOpen(true);
                }}
                placeholder="Start typing a name…"
                className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
              />
              {searchLoading && !picked ? (
                <span className="absolute right-3 top-9 text-[10px] text-[var(--admin-text-muted)]">Searching…</span>
              ) : null}
              {listOpen && !picked && searchResults.length > 0 ? (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded-md border border-[var(--admin-border)] bg-[var(--admin-sidebar-bg)] py-1 shadow-lg"
                >
                  {searchResults.map((u) => (
                    <li key={u.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--admin-card-bg)]"
                        onClick={() => selectDraftStaff(u)}
                      >
                        <span className="font-medium text-[var(--admin-text)]">
                          {u.full_name?.trim() || "—"}
                        </span>
                        <span className="text-xs text-[var(--admin-text-muted)]">{u.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {listOpen && !picked && !searchLoading && nameQuery.trim().length > 0 && searchResults.length === 0 ? (
                <p className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-[var(--admin-border)] bg-[var(--admin-sidebar-bg)] px-3 py-2 text-sm text-[var(--admin-text-muted)] shadow-lg">
                  No matching staff users.
                </p>
              ) : null}
            </div>
            <label className="w-40">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Role
              </span>
              <select
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value as "admin" | "editor")}
                className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleDraftAddClick}
              disabled={submitting || !picked}
              className="rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              Add member
            </button>
            {draftFormError ? <p className="w-full m-0 text-sm text-red-400">{draftFormError}</p> : null}
          </div>
          {draftMembers.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-[var(--admin-border)]">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-table-header-bg)]">
                    <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Name</th>
                    <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Email</th>
                    <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Role</th>
                    <th className="px-3 py-2 font-semibold text-[var(--admin-text)] w-24" />
                  </tr>
                </thead>
                <tbody>
                  {draftMembers.map((m) => (
                    <tr key={m.userId} className="border-b border-[var(--admin-border)]">
                      <td className="px-3 py-2 text-[var(--admin-text)]">{m.full_name?.trim() || "—"}</td>
                      <td className="px-3 py-2 text-[var(--admin-text-muted)]">{m.email}</td>
                      <td className="px-3 py-2 capitalize text-[var(--admin-text)]">{m.role}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeDraftMember(m.userId)}
                          className="text-sm font-semibold text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="m-0 text-sm text-[var(--admin-text-muted)]">No members queued yet — optional.</p>
          )}
        </div>
      ) : null}

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
