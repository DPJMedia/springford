"use client";

import { Tooltip } from "./Tooltip";
import { useTenant } from "@/lib/tenant/TenantProvider";

interface SectionSelectorProps {
  selectedSections: string[];
  onChange: (sections: string[]) => void;
}

function labelForSlug(
  slug: string,
  entries: Array<{ slug: string; label: string }>,
): string {
  return entries.find((e) => e.slug === slug)?.label ?? slug;
}

export function SectionSelector({ selectedSections, onChange }: SectionSelectorProps) {
  const { section_config: sectionConfig } = useTenant();

  function toggleSection(slug: string) {
    if (selectedSections.includes(slug)) {
      onChange(selectedSections.filter((s) => s !== slug));
    } else {
      onChange([...selectedSections, slug]);
    }
  }

  const heroEntry = sectionConfig.find((s) => s.slug === "hero");
  const otherEntries = sectionConfig.filter((s) => s.slug !== "hero");

  const unknownSelected = selectedSections.filter(
    (s) => !sectionConfig.some((c) => c.slug === s),
  );

  if (sectionConfig.length === 0) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        No sections are configured for this site. Add section slugs and labels in{" "}
        <strong>Admin → Tenants</strong> (edit this site) before you can assign articles to sections.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--admin-text-muted)] flex items-center">
        Select one or more sections where this article will appear:
        <Tooltip text="Only sections configured for this site are listed. Articles can appear in multiple sections." />
      </div>

      {heroEntry ? (
        <div className="bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)] rounded-lg p-4">
          <div className="text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
            Hero (top of homepage)
            <Tooltip text="When enabled, this article can be shown as the main hero story. Only one article should use hero at a time." />
          </div>
          <button
            type="button"
            onClick={() => toggleSection("hero")}
            className={`
              w-full px-4 py-3 rounded-lg border-2 font-semibold transition text-sm
              ${
                selectedSections.includes("hero")
                  ? "bg-[var(--admin-accent)] text-black border-[var(--admin-accent)]"
                  : "bg-[var(--admin-card-bg)] text-[var(--admin-text)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]/60"
              }
            `}
          >
            {selectedSections.includes("hero") && (
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {selectedSections.includes("hero") ? `✓ ${heroEntry.label}` : heroEntry.label}
          </button>
        </div>
      ) : null}

      {otherEntries.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-[var(--admin-text)] mb-2">
            {heroEntry ? "Sections" : "Site sections"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {otherEntries.map((section) => {
              const isSelected = selectedSections.includes(section.slug);
              return (
                <button
                  key={section.slug}
                  type="button"
                  onClick={() => toggleSection(section.slug)}
                  className={`
                    px-4 py-3 rounded-lg border-2 font-semibold transition text-sm
                    ${
                      isSelected
                        ? "bg-[var(--admin-accent)] text-black border-[var(--admin-accent)]"
                        : "bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50"
                    }
                  `}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {unknownSelected.length > 0 ? (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <p className="font-semibold mb-1">Not on this site&apos;s section list:</p>
          <ul className="flex flex-wrap gap-2">
            {unknownSelected.map((slug) => (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => onChange(selectedSections.filter((s) => s !== slug))}
                  className="rounded bg-black/20 px-2 py-1 hover:bg-black/40"
                >
                  {slug} ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[var(--admin-text-muted)]">
            Remove these or they may not appear correctly on the homepage.
          </p>
        </div>
      ) : null}

      {selectedSections.length === 0 && (
        <p className="text-xs text-red-400">Please select at least one section</p>
      )}
      {selectedSections.length > 0 && (
        <p className="text-xs text-[var(--admin-accent)]">
          ✓ Article will appear in:{" "}
          {selectedSections
            .map((s) => labelForSlug(s, sectionConfig))
            .join(", ")}
        </p>
      )}
    </div>
  );
}
