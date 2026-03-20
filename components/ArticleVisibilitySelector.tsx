"use client";

import { Tooltip } from "@/components/Tooltip";
import type { ArticleVisibility } from "@/lib/types/database";

const OPTIONS: {
  value: ArticleVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description:
      "The story is visible to everyone on the site, including visitors who are not signed in.",
  },
  {
    value: "newsletter_subscribers",
    label: "Newsletter subscribers only",
    description:
      "Only signed-in users who are subscribed to the Spring-Ford Press newsletter can read this article once it is published.",
  },
  {
    value: "admin_only",
    label: "Admin only",
    description:
      "Only users with the Admin or Super Admin role can view this article on the site. Useful for internal notes or pre-release content.",
  },
];

type Props = {
  value: ArticleVisibility;
  onChange: (v: ArticleVisibility) => void;
  disabled?: boolean;
};

export function ArticleVisibilitySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-slate-50/80 to-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">Audience when published</h2>
        <Tooltip text="Controls who can see this article on the live site after you publish it. Drafts are always limited to staff in the dashboard." />
      </div>
      <p className="mb-4 text-xs text-gray-600">
        Choose who can read this story on springford.press. This does not affect the admin article list.
      </p>
      <fieldset disabled={disabled} className="space-y-3">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
              value === opt.value
                ? "border-[color:var(--color-riviera-blue)] bg-blue-50/50 ring-1 ring-[color:var(--color-riviera-blue)]/30"
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="article-visibility"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-1 h-4 w-4 text-[color:var(--color-riviera-blue)] border-gray-300 focus:ring-[color:var(--color-riviera-blue)]"
            />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                <Tooltip text={opt.description} />
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
