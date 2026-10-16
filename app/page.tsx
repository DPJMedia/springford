import HomeClient from "./HomeClient";
import { loadTenantForPage } from "@/lib/tenant/loadTenantForPage";
import { createClient } from "@/lib/supabase/server";
import { ARTICLE_LIST_COLUMNS } from "@/lib/supabase/articleQueries";
import { parseStoredSectionConfig } from "@/lib/tenant/sectionConfigStorage";
import { buildHomeFeed, type HomeFeed } from "@/lib/articles/homeFeed";
import type { Article } from "@/lib/types/database";
export default async function HomePage() {
  const tenant = await loadTenantForPage();
  const db = await createClient();
  let initialFeed: HomeFeed | null = null;
  const [articles, picks] = await Promise.all([
    db
      .from("article_previews")
      .select(`${ARTICLE_LIST_COLUMNS},status`)
      .eq("tenant_id", tenant.id)
      .order("published_at", { ascending: false })
      .limit(1000),
    db
      .from("editors_picks")
      .select("article_id,position")
      .eq("tenant_id", tenant.id)
      .order("position"),
  ]);
  if (!articles.error)
    initialFeed = buildHomeFeed(
      (articles.data ?? []) as unknown as Article[],
      parseStoredSectionConfig(tenant.section_config)
        .sections.filter((s) => s.slug !== "hero")
        .map((s) => s.slug),
      (picks.data ?? []).map((p) => p.article_id),
    );
  return <HomeClient initialFeed={initialFeed} />;
}
