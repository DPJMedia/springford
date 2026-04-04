import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsletterBlock } from "@/lib/newsletter/buildEmailHtml";

/**
 * Ensures article blocks carry `articleIsAdvertisement` from the live articles table
 * so newsletter thumbnails match on-site sponsored labeling (including older saved campaigns).
 */
export async function enrichArticleBlocksWithAdvertisementFlags(
  supabase: SupabaseClient,
  blocks: NewsletterBlock[],
): Promise<NewsletterBlock[]> {
  const ids = [
    ...new Set(
      blocks
        .filter((b) => b.type === "article" && b.articleId)
        .map((b) => b.articleId as string),
    ),
  ];
  if (ids.length === 0) return blocks;

  const { data: rows } = await supabase
    .from("articles")
    .select("id, is_advertisement")
    .in("id", ids);

  const byId = new Map((rows || []).map((r) => [r.id, r.is_advertisement === true]));

  return blocks.map((b) => {
    if (b.type !== "article" || !b.articleId) return b;
    const live = byId.get(b.articleId);
    if (live === undefined) return b;
    return { ...b, articleIsAdvertisement: live };
  });
}
