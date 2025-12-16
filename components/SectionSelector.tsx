"use client";

import { Tooltip } from "./Tooltip";

interface SectionSelectorProps {
  selectedSections: string[];
  onChange: (sections: string[]) => void;
}

const AVAILABLE_SECTIONS = [
  { value: "hero", label: "Hero (Top of Page)", description: "Article becomes the main hero story at the top of the homepage" },
  { value: "politics", label: "Politics", description: "Appears in Politics section" },
  { value: "business", label: "Business", description: "Appears in Business section" },
  { value: "local", label: "Local", description: "Appears in Local news section" },
  { value: "sports", label: "Sports", description: "Appears in Sports section" },
  { value: "world", label: "World", description: "Appears in World news section" },
  { value: "technology", label: "Technology", description: "Appears in Technology section" },
  { value: "entertainment", label: "Entertainment", description: "Appears in Entertainment section" },
  { value: "opinion", label: "Opinion", description: "Appears in Opinion section" },
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
      <div className="text-sm text-gray-600 flex items-center">
        Select one or more sections where this article will appear:
        <Tooltip text="Articles can appear in multiple sections. Choose all sections where this article should be displayed. Hero makes it the main story at the top of the homepage." />
      </div>

      {/* Hero Section - Special */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <div className="text-sm font-semibold text-yellow-900 mb-2 flex items-center">
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
                ? "bg-yellow-600 text-white border-yellow-600"
                : "bg-white text-gray-700 border-yellow-400 hover:border-yellow-500"
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
        <p className="text-sm font-semibold text-gray-700 mb-2">Other Sections:</p>
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
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }
                `}
              >
                {isSelected && (
                  <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedSections.length === 0 && (
        <p className="text-xs text-red-600">⚠️ Please select at least one section</p>
      )}
      {selectedSections.length > 0 && (
        <p className="text-xs text-green-600">
          ✓ Article will appear in: {selectedSections.map((s) => AVAILABLE_SECTIONS.find((sec) => sec.value === s)?.label).join(", ")}
        </p>
      )}
    </div>
  );
}

