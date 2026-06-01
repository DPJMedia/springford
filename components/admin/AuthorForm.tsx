"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthorWithTenants, TenantRow } from "@/lib/types/database";
import { slugifyAuthorName } from "@/lib/authors/slug";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial: AuthorWithTenants | null;
  tenants: Pick<TenantRow, "id" | "name" | "slug">[];
  isSuperAdmin: boolean;
};

export function AuthorForm({ mode, initial, tenants, isSuperAdmin }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [twitterHandle, setTwitterHandle] = useState(initial?.twitter_handle ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedin_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial?.website_url ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? null);
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.cover_image_url ?? null);
  const [tenantIds, setTenantIds] = useState<string[]>(initial?.tenant_ids ?? []);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Auto-derive slug from name on create until the user manually edits it.
  useEffect(() => {
    if (!slugTouched && mode === "create") {
      setSlug(slugifyAuthorName(name));
    }
  }, [name, slugTouched, mode]);

  const initials = useMemo(() => {
    return (
      name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?"
    );
  }, [name]);

  function toggleTenant(id: string) {
    setTenantIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (tenantIds.length === 0) {
      setError("Assign the author to at least one site.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        slug: slug || slugifyAuthorName(name),
        title,
        bio,
        email,
        twitter_handle: twitterHandle,
        linkedin_url: linkedinUrl,
        website_url: websiteUrl,
        is_active: isActive,
      };
      if (isSuperAdmin) payload.tenant_ids = tenantIds;

      const url =
        mode === "create"
          ? "/api/admin/authors"
          : `/api/admin/authors/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Save failed.");
        return;
      }
      if (mode === "create") {
        router.push(`/admin/authors/${j.author.id}?created=1`);
      } else {
        router.refresh();
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(kind: "avatar" | "cover", file: File) {
    if (mode !== "edit" || !initial) return;
    setError(null);
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingCover;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch(`/api/admin/authors/${initial.id}/image`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Upload failed.");
        return;
      }
      if (kind === "avatar") setAvatarUrl(j.url);
      else setCoverImageUrl(j.url);
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage(kind: "avatar" | "cover") {
    if (mode !== "edit" || !initial) return;
    const label = kind === "avatar" ? "profile picture" : "thumbnail card image";
    if (!confirm(`Remove this ${label}?`)) return;
    setError(null);
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingCover;
    setBusy(true);
    try {
      const field = kind === "avatar" ? "avatar_url" : "cover_image_url";
      const res = await fetch(`/api/admin/authors/${initial.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: null }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Delete failed.");
        return;
      }
      if (kind === "avatar") setAvatarUrl(null);
      else setCoverImageUrl(null);
    } catch (err: any) {
      setError(err?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !initial) return;
    if (!confirm(`Delete "${initial.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/authors/${initial.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json();
        setError(typeof j.error === "string" ? j.error : "Delete failed.");
        return;
      }
      router.push("/admin/authors");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: identity */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">
              Identity
            </h2>
            <div className="space-y-4">
              <Field label="Name *">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="e.g. John McGuire"
                />
              </Field>

              <Field
                label="URL slug"
                hint='Used in /author/[slug]. Leave alone to auto-derive from name.'
              >
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  className={`${inputCls} font-mono`}
                  placeholder="john-mcguire"
                />
              </Field>

              <Field
                label="Title"
                hint="e.g. Reporter, Editor, Contributor."
                onClear={{ hasValue: !!title, onClick: () => setTitle("") }}
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="Reporter"
                />
              </Field>

              <Field
                label="Bio"
                onClear={{ hasValue: !!bio, onClick: () => setBio("") }}
              >
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  className={`${inputCls} resize-y`}
                  placeholder="A short biography that appears on the author page."
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">
              Contact &amp; links
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Email"
                onClear={{ hasValue: !!email, onClick: () => setEmail("") }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="reporter@example.com"
                />
              </Field>
              <Field
                label="Twitter / X handle"
                onClear={{ hasValue: !!twitterHandle, onClick: () => setTwitterHandle("") }}
              >
                <input
                  type="text"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  className={inputCls}
                  placeholder="@handle"
                />
              </Field>
              <Field
                label="LinkedIn URL"
                onClear={{ hasValue: !!linkedinUrl, onClick: () => setLinkedinUrl("") }}
              >
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className={inputCls}
                  placeholder="https://linkedin.com/in/…"
                />
              </Field>
              <Field
                label="Website"
                onClear={{ hasValue: !!websiteUrl, onClick: () => setWebsiteUrl("") }}
              >
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className={inputCls}
                  placeholder="https://…"
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Right column: images + tenants + state */}
        <div className="space-y-6">
          <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">
              Profile picture
            </h2>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--admin-border)]"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--admin-accent)] text-xl font-bold text-white ring-2 ring-[var(--admin-border)]">
                  {initials}
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage("avatar", f);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={mode === "create" || uploadingAvatar}
                    className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-1.5 text-sm font-medium text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)] disabled:opacity-50"
                  >
                    {uploadingAvatar ? "Working…" : avatarUrl ? "Replace" : "Upload"}
                  </button>
                  {avatarUrl && mode === "edit" && (
                    <button
                      type="button"
                      onClick={() => deleteImage("avatar")}
                      disabled={uploadingAvatar}
                      className="rounded-md border border-red-800/60 bg-red-950/30 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-950/60 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {mode === "create" && (
                  <p className="mt-1.5 text-xs text-[var(--admin-text-muted)]">
                    Save the author first to upload images.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">
              Thumbnail card image
            </h2>
            <div className="space-y-3">
              <div className="relative h-32 w-full overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)]">
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--admin-text-muted)]">
                    No image — a soft gradient will be used as a fallback.
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage("cover", f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={mode === "create" || uploadingCover}
                  className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-1.5 text-sm font-medium text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)] disabled:opacity-50"
                >
                  {uploadingCover ? "Working…" : coverImageUrl ? "Replace" : "Upload"}
                </button>
                {coverImageUrl && mode === "edit" && (
                  <button
                    type="button"
                    onClick={() => deleteImage("cover")}
                    disabled={uploadingCover}
                    className="rounded-md border border-red-800/60 bg-red-950/30 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-950/60 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
            <h2 className="mb-1 text-lg font-semibold text-[var(--admin-text)]">
              Sites
            </h2>
            <p className="mb-3 text-xs text-[var(--admin-text-muted)]">
              {isSuperAdmin
                ? "Check every site where this author can be tagged on articles."
                : "Only super admins can change site assignments."}
            </p>
            <div className="space-y-2">
              {tenants.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm ${
                    isSuperAdmin ? "cursor-pointer hover:bg-[var(--admin-table-row-hover)]" : "opacity-70"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={tenantIds.includes(t.id)}
                    onChange={() => toggleTenant(t.id)}
                    className="h-4 w-4 accent-[var(--admin-accent)]"
                  />
                  <span className="text-[var(--admin-text)]">{t.name}</span>
                  <span className="ml-auto font-mono text-xs text-[var(--admin-text-muted)]">
                    {t.slug}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-[var(--admin-accent)]"
              />
              <span className="font-medium text-[var(--admin-text)]">Active</span>
              <span className="text-xs text-[var(--admin-text-muted)]">
                Inactive authors are hidden from the article publish picker.
              </span>
            </label>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--admin-border)] pt-6">
        <div>
          {mode === "edit" && isSuperAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/60 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete author"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/authors")}
            className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-4 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : mode === "create" ? "Create author" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]";

function Field({
  label,
  hint,
  children,
  onClear,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  /**
   * When provided AND the field is non-empty, renders a small "Clear" link
   * next to the label that wipes the value. Standard form-clear pattern so
   * admins don't have to manually select + delete every character.
   */
  onClear?: { hasValue: boolean; onClick: () => void };
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-[var(--admin-text)]">
          {label}
        </label>
        {onClear?.hasValue && (
          <button
            type="button"
            onClick={onClear.onClick}
            className="text-xs font-medium text-[var(--admin-text-muted)] hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{hint}</p>
      )}
    </div>
  );
}
