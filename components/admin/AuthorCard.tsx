"use client";

import Link from "next/link";
import type { AuthorWithTenants } from "@/lib/types/database";

type TenantLookup = Map<string, { name: string; slug: string }>;

export function AuthorCard({
  author,
  tenants,
}: {
  author: AuthorWithTenants;
  tenants: TenantLookup;
}) {
  const initials =
    author.name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <Link
      href={`/admin/authors/${author.id}`}
      className="group relative block overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] transition hover:border-[var(--admin-accent)]/60 hover:shadow-lg"
    >
      {/* Cover / thumbnail banner */}
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-[var(--admin-accent)]/30 via-[var(--admin-accent)]/10 to-[var(--admin-table-header-bg)]">
        {author.cover_image_url && (
          <img
            src={author.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {!author.is_active && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Inactive
          </span>
        )}
      </div>

      {/* Avatar — absolutely positioned with z-20 so it's GUARANTEED to
          render on top of the cover banner. The thick border in the card
          background color creates the Twitter-style cutout effect. */}
      <div className="absolute left-4 top-14 z-20">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.name}
            className="block h-20 w-20 rounded-full border-4 border-[var(--admin-card-bg)] object-cover shadow-lg ring-1 ring-black/10"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--admin-card-bg)] bg-[var(--admin-accent)] text-xl font-bold text-white shadow-lg ring-1 ring-black/10">
            {initials}
          </div>
        )}
      </div>

      {/* Body — top padding leaves room for the avatar's lower half */}
      <div className="px-4 pt-14 pb-4">
        <div className="mb-1 truncate text-base font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent)]">
          {author.name}
        </div>
        {author.title && (
          <div className="mb-2 truncate text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-muted)]">
            {author.title}
          </div>
        )}
        {author.bio && (
          <p className="mb-3 line-clamp-2 text-sm text-[var(--admin-text-muted)]">
            {author.bio}
          </p>
        )}

        {author.tenant_ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {author.tenant_ids.map((tid) => {
              const t = tenants.get(tid);
              return (
                <span
                  key={tid}
                  className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--admin-text-muted)]"
                >
                  {t?.name ?? "Unknown site"}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
