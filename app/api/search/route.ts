import { createClient } from "@/lib/supabase/server";
import { allowRateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const SEARCH_PER_MIN = 120;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!allowRateLimit(`search:${ip}`, SEARCH_PER_MIN, 60_000)) {
    return NextResponse.json(
      { articles: [], total: 0, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ articles: [], total: 0 });
  }

  const supabase = await createClient();

  // Use full-text search RPC (word-boundary matching: "car" matches "car" not "carbon"/"scar")
  const { data, error } = await supabase.rpc("search_articles", {
    search_query: q,
  });

  if (error) {
    console.error("Search error (RPC may not exist - run migration):", error);
    // Fallback: use ilike if RPC not yet deployed
    return fallbackSearch(supabase, q);
  }

  return NextResponse.json({
    articles: data || [],
    total: (data || []).length,
  });
}

async function fallbackSearch(supabase: Awaited<ReturnType<typeof createClient>>, q: string) {
  const now = new Date().toISOString();
  const escaped = q.replace(/'/g, "''");
  const searchableFields = ["title", "excerpt", "content", "meta_title", "meta_description", "category"];
  const orConditions = searchableFields.map((f) => `${f}.ilike.%${escaped}%`).join(",");

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, image_url, author_name, published_at, category")
    .eq("status", "published")
    .lte("published_at", now)
    .or(orConditions)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ articles: [], total: 0 }, { status: 200 });
  return NextResponse.json({ articles: data || [], total: (data || []).length });
}
