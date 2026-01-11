type SectionCardProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div className="rounded-[18px] bg-[color:var(--color-panel)] p-6 shadow-soft">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-medium)]">
            {title}
          </p>
          <p className="mt-1 text-[color:var(--color-medium)]">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}




