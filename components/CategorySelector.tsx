"use client";

interface CategorySelectorProps {
  value: string;
  onChange: (category: string) => void;
}

const CATEGORIES = [
  { value: "", label: "Select a category..." },
  { value: "breaking-news", label: "Breaking News" },
  { value: "town-council", label: "Town Council" },
  { value: "town-decisions", label: "Town Decisions" },
  { value: "board-of-education", label: "Board of Education" },
  { value: "local-governance", label: "Local Governance" },
  { value: "public-meetings", label: "Public Meetings" },
  { value: "community-events", label: "Community Events" },
  { value: "sports", label: "Sports" },
  { value: "local-business", label: "Local Business" },
  { value: "real-estate", label: "Real Estate" },
  { value: "crime-safety", label: "Crime & Safety" },
  { value: "weather", label: "Weather" },
  { value: "development", label: "Development & Construction" },
  { value: "environment", label: "Environment" },
  { value: "arts-culture", label: "Arts & Culture" },
  { value: "health", label: "Health & Wellness" },
  { value: "transportation", label: "Transportation" },
  { value: "announcements", label: "Announcements" },
  { value: "other", label: "Other" },
];

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2">
        Category
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
      >
        {CATEGORIES.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-[var(--admin-text-muted)] mt-1">
        Select the most appropriate category for this article
      </p>
    </div>
  );
}



