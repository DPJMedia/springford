"use client";

import { Tooltip } from "./Tooltip";

interface SectionSelectorProps {
  selectedSections: string[];
  onChange: (sections: string[]) => void;
}

const AVAILABLE_SECTIONS = [
  { value: "hero", label: "Hero (Top of Page)", description: "Article becomes the main hero story at the top of the homepage" },
  { value: "spring-city", label: "Spring City", description: "News from Spring City area" },
  { value: "royersford", label: "Royersford", description: "News from Royersford area" },
  { value: "limerick", label: "Limerick", description: "News from Limerick area" },
  { value: "upper-providence", label: "Upper Providence", description: "News from Upper Providence area" },
  { value: "school-district", label: "School District", description: "School district news and updates" },
  { value: "politics", label: "Politics", description: "Local politics and government" },
  { value: "business", label: "Business", description: "Local business news" },
  { value: "events", label: "Events", description: "Community events and activities" },
  { value: "opinion", label: "Opinion", description: "Opinion pieces and editorials" },
];

export function SectionSelector({ selectedSections, onChange }: SectionSelectorProps) {
  function toggleSection(section: string) {
    if (selectedSections.includes(section)) {
      onChange(selectedSections.filter((s) => s !== section));
    } else {
      onChange([...selectedSections, section]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--admin-text-muted)] flex items-center">
        Select one or more sections where this article will appear:
        <Tooltip text="Articles can appear in multiple sections. Choose all sections where this article should be displayed. Hero makes it the main story at the top of the homepage." />
      </div>

      {/* Hero Section - Special */}
      <div className="bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)] rounded-lg p-4">
        <div className="text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
          🌟 Hero Section (Top of Homepage)
          <Tooltip text="Enable this to make this article the main hero story at the very top of the homepage. Only one article can be hero at a time." />
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
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {selectedSections.includes("hero") ? "✓ Hero Article" : "Make Hero Article"}
        </button>
      </div>

      {/* Regular Sections */}
      <div>
        <p className="text-sm font-semibold text-[var(--admin-text)] mb-2">Other Sections:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AVAILABLE_SECTIONS.filter(s => s.value !== "hero").map((section) => {
            const isSelected = selectedSections.includes(section.value);
            return (
              <button
                key={section.value}
                type="button"
                onClick={() => toggleSection(section.value)}
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

      {selectedSections.length === 0 && (
        <p className="text-xs text-red-400">⚠️ Please select at least one section</p>
      )}
      {selectedSections.length > 0 && (
        <p className="text-xs text-[var(--admin-accent)]">
          ✓ Article will appear in: {selectedSections.map((s) => AVAILABLE_SECTIONS.find((sec) => sec.value === s)?.label).join(", ")}
        </p>
      )}
    </div>
  );
}

