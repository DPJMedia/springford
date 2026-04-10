import { createClient } from "@/lib/supabase/server";
import { allowRateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const SUGGESTIONS_PER_MIN = 120;

const SECTIONS = [
  { label: "Spring City", query: "Spring City", slug: "spring-city" },
  { label: "Royersford", query: "Royersford", slug: "royersford" },
  { label: "Limerick", query: "Limerick", slug: "limerick" },
  { label: "Upper Providence", query: "Upper Providence", slug: "upper-providence" },
  { label: "School District", query: "School District", slug: "school-district" },
  { label: "Politics", query: "Politics", slug: "politics" },
  { label: "Business", query: "Business", slug: "business" },
  { label: "Events", query: "Events", slug: "events" },
  { label: "Opinion", query: "Opinion", slug: "opinion" },
];

export type SuggestionItem = {
  label: string;
  query: string;
  type: "section" | "article" | "tag";
  slug?: string;
  imageUrl?: string;
};

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!allowRateLimit(`suggestions:${ip}`, SUGGESTIONS_PER_MIN, 60_000)) {
    return NextResponse.json(
      { suggestions: [], error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions: SuggestionItem[] = [];
  const seen = new Set<string>();

  // 1. Section matches (label or slug)
  for (const s of SECTIONS) {
    if (suggestions.length >= 5) break;
    if (s.label.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q.replace(/\s/g, "-"))) {
      const key = `section:${s.query}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({ label: s.label, query: s.query, type: "section" });
      }
    }
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // 2. Article title matches (published only) — include slug and image_url
  if (suggestions.length < 5) {
    const { data: articles } = await supabase
      .from("articles")
      .select("title, slug, image_url")
      .eq("status", "published")
      .lte("published_at", now)
      .ilike("title", `%${escaped}%`)
      .order("published_at", { ascending: false })
      .limit(6);

    for (const a of articles || []) {
      if (suggestions.length >= 5) break;
      const article = a as { title: string; slug: string; image_url: string | null };
      const key = `article:${article.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          label: article.title,
          query: article.title,
          type: "article",
          slug: article.slug,
          imageUrl: article.image_url ?? undefined,
        });
      }
    }
  }

  // 3. Tags from published articles (distinct tags that contain q)
  if (suggestions.length < 5) {
    const { data: tagRows } = await supabase
      .from("articles")
      .select("tags")
      .eq("status", "published")
      .lte("published_at", now)
      .not("tags", "is", null)
      .limit(100);

    const tagSet = new Set<string>();
    for (const row of tagRows || []) {
      const tags = (row as { tags: string[] | null }).tags;
      if (Array.isArray(tags)) {
        for (const t of tags) {
          if (t && typeof t === "string" && t.toLowerCase().includes(q)) tagSet.add(t);
        }
      }
    }
    for (const tag of tagSet) {
      if (suggestions.length >= 5) break;
      const key = `tag:${tag}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({ label: tag, query: tag, type: "tag" });
      }
    }
  }

  return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
}
