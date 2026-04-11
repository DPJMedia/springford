"use client";

import { useMemo } from "react";
import { Tooltip } from "@/components/Tooltip";
import type { ArticleVisibility } from "@/lib/types/database";
import { useTenant } from "@/lib/tenant/TenantProvider";

type Props = {
  value: ArticleVisibility;
  onChange: (v: ArticleVisibility) => void;
  disabled?: boolean;
};

export function ArticleVisibilitySelector({ value, onChange, disabled }: Props) {
  const { name: siteName, domain } = useTenant();
  const wwwHost = useMemo(
    () => `www.${domain.replace(/^www\./i, "").trim()}`,
    [domain],
  );

  const options = useMemo(
    () =>
      [
        {
          value: "public" as const,
          label: "Public",
          description:
            "The story is visible to everyone on the site, including visitors who are not signed in.",
        },
        {
          value: "newsletter_subscribers" as const,
          label: "Newsletter subscribers only",
          description: `Only signed-in users who are subscribed to the ${siteName} newsletter can read this article once it is published.`,
        },
        {
          value: "admin_only" as const,
          label: "Admin only",
          description:
            "Only users with the Admin or Super Admin role can view this article on the site. Useful for internal notes or pre-release content.",
        },
      ] satisfies {
        value: ArticleVisibility;
        label: string;
        description: string;
      }[],
    [siteName],
  );

  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold text-[var(--admin-text)]">Audience when published</h2>
        <Tooltip text="Controls who can see this article on the live site after you publish it. Drafts are always limited to staff in the dashboard." />
      </div>
      <p className="mb-4 text-xs text-[var(--admin-text-muted)]">
        Choose who can read this story on {wwwHost}. This does not affect the admin article list.
      </p>
      <fieldset disabled={disabled} className="space-y-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
              value === opt.value
                ? "border-[var(--admin-accent)] bg-[var(--admin-table-header-bg)] ring-1 ring-[var(--admin-accent)]/35"
                : "border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] hover:border-[var(--admin-text-muted)]/40"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="article-visibility"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-1 h-4 w-4 accent-[var(--admin-accent)] border-[var(--admin-border)] focus:ring-[var(--admin-accent)]"
            />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--admin-text)]">{opt.label}</span>
                <Tooltip text={opt.description} />
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
