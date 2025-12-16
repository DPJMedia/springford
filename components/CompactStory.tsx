import { Article } from "@/lib/mockData";

type CompactStoryProps = {
  article: Article;
  showStatus?: boolean;
};

export function CompactStory({ article, showStatus = true }: CompactStoryProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-[color:var(--color-border)] pb-2 last:border-none">
      <div className="text-[10px] text-[color:var(--color-medium)]">
        <span className="uppercase tracking-wider font-semibold">
          {article.category}
        </span>
      </div>
      <h4 className="headline text-sm font-semibold text-[color:var(--color-dark)] leading-tight">
        {article.title}
      </h4>
      <div className="flex items-center gap-1 text-[10px] text-[color:var(--color-medium)]">
        <span>{article.neighborhood}</span>
        <span className="h-1 w-1 rounded-full bg-[color:var(--color-border)]" />
        <span>{new Date(article.date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

