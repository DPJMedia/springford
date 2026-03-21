/**
 * Columns for feeds, cards, and related lists — excludes `content` and `content_blocks`
 * (large JSON payloads). Using this instead of `*` on article list queries reduces
 * Supabase data transfer (including cached egress) without changing what users see.
 */
export const ARTICLE_LIST_COLUMNS =
  "id, title, slug, subtitle, excerpt, image_url, published_at, author_name, sections, section, category, tags, is_advertisement, is_breaking, visibility, is_featured, breaking_news_set_at, breaking_news_duration, share_count, view_count, created_at, updated_at";
