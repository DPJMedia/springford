import { ArticleStatus } from "@/lib/mockData";

const statusStyles: Record<ArticleStatus, string> = {
  published:
    "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  scheduled:
    "bg-purple-100 text-purple-700",
};

type StatusBadgeProps = {
  status: ArticleStatus;
  scheduledFor?: string;
};

export function StatusBadge({ status, scheduledFor }: StatusBadgeProps) {
  const label =
    status === "scheduled" && scheduledFor
      ? `Scheduled • ${new Date(scheduledFor).toLocaleString()}`
      : status === "draft"
        ? "Draft"
        : "Published";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[status]}`}
    >
      {label}
    </span>
  );
}

