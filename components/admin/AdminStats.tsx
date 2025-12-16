import { Article } from "@/lib/mockData";

function countByStatus(articles: Article[]) {
  return articles.reduce(
    (acc, article) => {
      acc[article.status] += 1;
      return acc;
    },
    { published: 0, draft: 0, scheduled: 0 }
  );
}

type AdminStatsProps = {
  articles: Article[];
};

export function AdminStats({ articles }: AdminStatsProps) {
  const counts = countByStatus(articles);

  const cards = [
    {
      label: "Published",
      value: counts.published,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Scheduled",
      value: counts.scheduled,
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      label: "Drafts",
      value: counts.draft,
      color: "text-gray-700",
      bg: "bg-gray-50",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg ${card.bg} px-4 py-3 border border-gray-200`}
        >
          <p className="text-sm text-[color:var(--color-medium)]">
            {card.label}
          </p>
          <p className={`text-2xl font-semibold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

