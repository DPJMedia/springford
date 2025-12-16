import { Article } from "@/lib/mockData";

type NewsCardProps = {
  article: Article;
};

export function NewsCard({ article }: NewsCardProps) {
  return (
    <article className="group grid gap-3 rounded-lg bg-white p-3 shadow-soft ring-1 ring-[color:var(--color-border)] transition hover:shadow-md md:grid-cols-5 md:items-start">
      <div className="relative overflow-hidden rounded-md bg-gray-100 md:col-span-1 h-[100px]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50" />
      </div>
      <div className="md:col-span-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--color-medium)]">
          <span className="font-semibold">{article.category}</span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-medium)]" />
          <span>{article.neighborhood}</span>
        </div>
        <h3 className="headline text-lg font-semibold text-[color:var(--color-dark)] leading-tight">
          {article.title}
        </h3>
        <p className="text-[color:var(--color-medium)] text-sm leading-relaxed line-clamp-2">
          {article.excerpt}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-medium)]">
          <time dateTime={article.date}>
            {new Date(article.date).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-border)]" />
          <span>{article.author}</span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-border)]" />
          <a className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline" href="#">
            Read story →
          </a>
        </div>
      </div>
    </article>
  );
}

