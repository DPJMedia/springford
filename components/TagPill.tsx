type TagPillProps = {
  label: string;
};

export function TagPill({ label }: TagPillProps) {
  return (
    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[color:var(--color-riviera-blue)]">
      {label}
    </span>
  );
}

