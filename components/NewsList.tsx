import { Article } from "@/lib/mockData";
import { NewsCard } from "./NewsCard";

type NewsListProps = {
  articles: Article[];
};

export function NewsList({ articles }: NewsListProps) {
  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-6 py-6 text-center text-sm text-[color:var(--color-medium)]">
        No articles match those filters yet. Try a different neighborhood or
        category.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}

