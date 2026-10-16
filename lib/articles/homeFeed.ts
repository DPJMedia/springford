import type { Article } from "@/lib/types/database";
export function buildHomeFeed(
  articles: Article[],
  sections: string[],
  pickIds: string[],
  now = Date.now(),
) {
  const date = (a: Article) => Date.parse(a.published_at || "") || 0;
  const rows = articles
    .filter((a) => a.status === "published" && date(a) <= now)
    .sort((a, b) => date(b) - date(a));
  const recent = rows.filter((a) => date(a) >= now - 10 * 86400000);
  const featured = recent
    .slice()
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 4);
  const hot = rows
    .filter((a) => date(a) >= now - 5 * 86400000)
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);
  const fallback = recent.filter((a) => date(a) < now - 5 * 86400000);
  return {
    hero: rows.find((a) => a.sections?.includes("hero")) ?? null,
    featured,
    latest: rows.slice(0, 15),
    breaking: rows
      .filter(
        (a) =>
          a.is_breaking &&
          (!a.breaking_news_set_at ||
            now <
              Date.parse(a.breaking_news_set_at) +
                (a.breaking_news_duration || 24) * 3600000),
      )
      .slice(0, 10),
    trending: [...hot, ...fallback.slice(0, Math.max(0, 5 - hot.length))],
    picks: pickIds.length
      ? pickIds
          .map((id) => rows.find((a) => a.id === id))
          .filter((a): a is Article => !!a)
      : featured.slice(0, 3),
    sections: Object.fromEntries(
      sections.map((s) => [
        s,
        rows.filter((a) => a.sections?.includes(s)).slice(0, 15),
      ]),
    ),
  };
}
export type HomeFeed = ReturnType<typeof buildHomeFeed>;
