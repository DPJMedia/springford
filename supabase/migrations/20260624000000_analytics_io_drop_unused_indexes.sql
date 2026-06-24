-- Disk I/O reduction: drop unused / duplicate indexes on the high-write analytics
-- tables so each insert maintains fewer indexes (less WAL + write IOPS), and let
-- page_views use HOT updates for its per-visit "time spent / scroll" update.
--
-- All indexes below were confirmed via pg_stat_user_indexes to have ~0 reads while
-- being maintained on every insert into the hottest tables (article_scroll_data
-- ~14.7k/day, ad_impressions ~12.5k/day, page_views ~7.5k/day). The geo columns
-- (city/state/country) are aggregated in the admin dashboard via time-bounded
-- GROUP BY (served by the viewed_at index), never by these single-column indexes.
--
-- NOTE: applied to production with DROP INDEX CONCURRENTLY (non-blocking). This file
-- uses plain DROP INDEX IF EXISTS so it remains idempotent and transaction-safe for
-- rebuilds; it is a no-op against the already-migrated production database.

-- article_scroll_data: session lookup never used (0 scans, 4.4 MB)
DROP INDEX IF EXISTS public.idx_article_scroll_data_session;

-- ad_impressions: geo single-column indexes effectively unused
DROP INDEX IF EXISTS public.idx_ad_impressions_city;
DROP INDEX IF EXISTS public.idx_ad_impressions_state;
DROP INDEX IF EXISTS public.idx_ad_impressions_country;

-- page_views: geo single-column indexes effectively unused
DROP INDEX IF EXISTS public.idx_page_views_city;
DROP INDEX IF EXISTS public.idx_page_views_state;
DROP INDEX IF EXISTS public.idx_page_views_country;

-- notifications: unused + exact duplicates
DROP INDEX IF EXISTS public.idx_notifications_is_read;     -- 0 scans
DROP INDEX IF EXISTS public.idx_notifications_created_at;  -- duplicate of idx_notifications_created (created_at DESC)
DROP INDEX IF EXISTS public.idx_notifications_user;        -- duplicate of idx_notifications_user_id (user_id)

-- Leave headroom in each page_views heap page so the per-visit UPDATE
-- (time_spent_seconds / scroll_depth / completed) can be a HOT update and avoid
-- rewriting indexes. Applies to pages written after this change.
ALTER TABLE public.page_views SET (fillfactor = 90);
