type AdminFiltersProps = {
  status: string;
  category: string;
  sort: string;
  categories: string[];
  onChange: (next: { status: string; category: string; sort: string }) => void;
};

export function AdminFilters({
  status,
  category,
  sort,
  categories,
  onChange,
}: AdminFiltersProps) {
  const update = (field: keyof AdminFiltersProps, value: string) => {
    onChange({ status, category, sort, [field]: value } as AdminFiltersProps);
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-2">
      <Select
        label="Status"
        value={status}
        options={["All", "Published", "Draft", "Scheduled"]}
        onChange={(val) => update("status", val)}
      />
      <Select
        label="Category"
        value={category}
        options={["All", ...categories]}
        onChange={(val) => update("category", val)}
      />
      <Select
        label="Sort"
        value={sort}
        options={["Most Recent", "Oldest"]}
        onChange={(val) => update("sort", val)}
      />
    </div>
  );
}

type SelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-[color:var(--color-dark)]">
      <span className="font-semibold">{label}:</span>
      <select
        className="rounded border border-[color:var(--color-border)] bg-white px-2 py-1 text-sm text-[color:var(--color-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

