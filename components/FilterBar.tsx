type FilterBarProps = {
  category: string;
  neighborhood: string;
  town: string;
  sort: string;
  categories: string[];
  neighborhoods: string[];
  towns: string[];
  onChange: (next: {
    category: string;
    neighborhood: string;
    town: string;
    sort: string;
  }) => void;
};

export function FilterBar({
  category,
  neighborhood,
  town,
  sort,
  categories,
  neighborhoods,
  towns,
  onChange,
}: FilterBarProps) {
  const update = (field: keyof FilterBarProps, value: string) => {
    onChange({
      category,
      neighborhood,
      town,
      sort,
      [field]: value,
    } as FilterBarProps);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-[color:var(--color-panel)] p-2 shadow-soft md:flex-row md:items-center md:justify-between border border-[color:var(--color-border)]">
      <div className="flex flex-1 flex-wrap gap-1.5">
        <Select
          label="Category"
          value={category}
          onChange={(val) => update("category", val)}
          options={["All", ...categories]}
        />
        <Select
          label="Neighborhood"
          value={neighborhood}
          onChange={(val) => update("neighborhood", val)}
          options={["All", ...neighborhoods]}
        />
        <Select
          label="Town"
          value={town}
          onChange={(val) => update("town", val)}
          options={["All", ...towns]}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Select
          label="Sort"
          value={sort}
          onChange={(val) => update("sort", val)}
          options={["Most Recent", "Oldest"]}
        />
      </div>
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
    <label className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs text-[color:var(--color-dark)]">
      <span className="whitespace-nowrap font-semibold">{label}:</span>
      <select
        className="min-w-[100px] rounded border border-[color:var(--color-border)] bg-white px-1.5 py-0.5 text-xs text-[color:var(--color-dark)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-riviera-blue)]"
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

