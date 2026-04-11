-- Tenant-scoped admin analytics: filter aggregates by tenant_id.
-- p_tenant_id NULL preserves legacy "all tenants" behavior during deploy; the app passes tenant id explicitly.
-- Note: newsletter_campaigns / newsletter_email_events are not queried by this RPC (no changes for those tables).

DROP FUNCTION IF EXISTS public.get_admin_analytics_dashboard(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  int
);

CREATE OR REPLACE FUNCTION public.get_admin_analytics_dashboard(
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_chart_start timestamptz,
  p_chart_end timestamptz,
  p_chart_granularity text,
  p_chart_bucket_count int,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chart jsonb;
BEGIN
  -- ── Chart series (homepage + article counts per bucket) ───────────────
  IF p_chart_granularity = 'hour' THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'bucketKey',
          to_char(s.bucket, 'YYYY-MM-DD"T"HH24'),
          'homepage',
          COALESCE(a.homepage, 0),
          'article',
          COALESCE(a.article, 0)
        )
        ORDER BY s.bucket
      ),
      '[]'::jsonb
    )
    INTO v_chart
    FROM (
      SELECT generate_series(
        date_trunc('hour', p_chart_end) - ((GREATEST(1, p_chart_bucket_count) - 1) * interval '1 hour'),
        date_trunc('hour', p_chart_end),
        interval '1 hour'
      ) AS bucket
    ) s
    LEFT JOIN (
      SELECT
        date_trunc('hour', viewed_at) AS bucket,
        COUNT(*) FILTER (WHERE view_type = 'homepage')::int AS homepage,
        COUNT(*) FILTER (WHERE view_type = 'article')::int AS article
      FROM page_views
      WHERE viewed_at >= p_chart_start
        AND viewed_at <= p_chart_end
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
      GROUP BY 1
    ) a ON a.bucket = s.bucket;
  ELSE
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'bucketKey',
          to_char(s.day, 'YYYY-MM-DD'),
          'homepage',
          COALESCE(a.homepage, 0),
          'article',
          COALESCE(a.article, 0)
        )
        ORDER BY s.day
      ),
      '[]'::jsonb
    )
    INTO v_chart
    FROM (
      SELECT d::date AS day
      FROM generate_series(
        (date_trunc('day', p_chart_end AT TIME ZONE 'UTC'))::date
          - (GREATEST(1, p_chart_bucket_count) - 1),
        (date_trunc('day', p_chart_end AT TIME ZONE 'UTC'))::date,
        interval '1 day'
      ) AS d
    ) s
    LEFT JOIN (
      SELECT
        (viewed_at AT TIME ZONE 'UTC')::date AS day,
        COUNT(*) FILTER (WHERE view_type = 'homepage')::int AS homepage,
        COUNT(*) FILTER (WHERE view_type = 'article')::int AS article
      FROM page_views
      WHERE viewed_at >= p_chart_start
        AND viewed_at <= p_chart_end
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
      GROUP BY 1
    ) a ON a.day = s.day;
  END IF;

  RETURN jsonb_build_object(
    'totalPageViews',
    (
      SELECT COUNT(*)::int
      FROM page_views
      WHERE viewed_at >= p_range_start
        AND viewed_at <= p_range_end
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ),
    'avgSessionSeconds',
    COALESCE(
      (
        WITH filtered AS (
          SELECT *
          FROM page_views
          WHERE viewed_at >= p_range_start
            AND viewed_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
            AND NOT (
              (COALESCE(city, '') = 'Development' AND COALESCE(state, '') = 'Local')
              OR (
                referrer_url IS NOT NULL
                AND (
                  referrer_url ~* 'localhost'
                  OR referrer_url ~* '127\.0\.0\.1'
                )
              )
            )
        ),
        per_session AS (
          SELECT session_id, SUM(time_spent_seconds)::bigint AS total_sec
          FROM filtered
          WHERE time_spent_seconds > 0
          GROUP BY session_id
        )
        SELECT ROUND(AVG(total_sec))::int
        FROM per_session
      ),
      0
    ),
    'totalAdImpressions',
    (
      SELECT COUNT(*)::int
      FROM ad_impressions
      WHERE viewed_at >= p_range_start
        AND viewed_at <= p_range_end
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ),
    'adClicksInRange',
    (
      SELECT COUNT(*)::int
      FROM ad_clicks
      WHERE clicked_at >= p_range_start
        AND clicked_at <= p_range_end
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ),
    'publishedArticleCount',
    (
      SELECT COUNT(*)::int
      FROM articles
      WHERE status = 'published'
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ),
    'avgReadingTimeSeconds',
    COALESCE(
      (
        SELECT ROUND(AVG(time_spent_seconds))::int
        FROM article_scroll_data
        WHERE created_at >= p_range_start
          AND created_at <= p_range_end
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
      ),
      0
    ),
    'completionRatePercent',
    COALESCE(
      (
        SELECT
          CASE
            WHEN COUNT(*) = 0 THEN 0::numeric
            ELSE ROUND(
              (COUNT(*) FILTER (WHERE max_scroll_percent >= 90))::numeric
                / NULLIF(COUNT(*), 0) * 100,
              2
            )
          END
        FROM article_scroll_data
        WHERE created_at >= p_range_start
          AND created_at <= p_range_end
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
      ),
      0
    ),
    'topArticles',
    COALESCE(
      (
        WITH top AS (
          SELECT
            id,
            title,
            slug,
            section,
            author_name,
            view_count,
            share_count
          FROM articles
          WHERE status = 'published'
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          ORDER BY view_count DESC NULLS LAST
          LIMIT 10
        ),
        scroll AS (
          SELECT
            article_id,
            ROUND(AVG(time_spent_seconds))::int AS avg_time
          FROM article_scroll_data
          WHERE created_at >= p_range_start
            AND created_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY article_id
        )
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',
            t.id,
            'title',
            t.title,
            'slug',
            t.slug,
            'section',
            t.section,
            'author_name',
            t.author_name,
            'view_count',
            t.view_count,
            'share_count',
            COALESCE(t.share_count, 0),
            'avgTimeSpent',
            COALESCE(s.avg_time, 0)
          )
          ORDER BY t.view_count DESC NULLS LAST
        )
        FROM top t
        LEFT JOIN scroll s ON s.article_id = t.id
      ),
      '[]'::jsonb
    ),
    'sectionPerformance',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name',
            section_name,
            'views',
            0,
            'clicks',
            c_cnt::int,
            'avgTimeSpent',
            0
          )
          ORDER BY c_cnt DESC
        )
        FROM (
          SELECT section_name, COUNT(*) AS c_cnt
          FROM section_clicks
          WHERE clicked_at >= p_range_start
            AND clicked_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY section_name
          ORDER BY COUNT(*) DESC
          LIMIT 5
        ) sc
      ),
      '[]'::jsonb
    ),
    'authorPerformance',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name',
            author_name,
            'clicks',
            c_cnt::int
          )
          ORDER BY c_cnt DESC
        )
        FROM (
          SELECT author_name, COUNT(*) AS c_cnt
          FROM author_clicks
          WHERE clicked_at >= p_range_start
            AND clicked_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY author_name
          ORDER BY COUNT(*) DESC
          LIMIT 5
        ) ac
      ),
      '[]'::jsonb
    ),
    'adSlotPerformance',
    COALESCE(
      (
        WITH imp AS (
          SELECT ad_slot, COUNT(*)::int AS impressions
          FROM ad_impressions
          WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY ad_slot
        ),
        clk AS (
          SELECT ad_slot, COUNT(*)::int AS clicks
          FROM ad_clicks
          WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY ad_slot
        ),
        slots AS (
          SELECT ad_slot FROM imp
          UNION
          SELECT ad_slot FROM clk
        )
        SELECT jsonb_agg(
          jsonb_build_object(
            'slot',
            s.ad_slot,
            'impressions',
            COALESCE(i.impressions, 0),
            'clicks',
            COALESCE(c.clicks, 0),
            'ctr',
            CASE
              WHEN COALESCE(i.impressions, 0) > 0 THEN
                ROUND((COALESCE(c.clicks, 0))::numeric / i.impressions * 100, 2)::text
              ELSE '0.00'
            END
          )
          ORDER BY s.ad_slot
        )
        FROM slots s
        LEFT JOIN imp i ON i.ad_slot = s.ad_slot
        LEFT JOIN clk c ON c.ad_slot = s.ad_slot
      ),
      '[]'::jsonb
    ),
    'topAds',
    COALESCE(
      (
        WITH imp AS (
          SELECT ad_id, COUNT(*)::int AS impressions
          FROM ad_impressions
          WHERE viewed_at >= p_range_start
            AND viewed_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY ad_id
        ),
        clk AS (
          SELECT ad_id, COUNT(*)::int AS clicks
          FROM ad_clicks
          WHERE clicked_at >= p_range_start
            AND clicked_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY ad_id
        ),
        ids AS (
          SELECT ad_id FROM imp
          UNION
          SELECT ad_id FROM clk
        ),
        ranked AS (
          SELECT
            ids.ad_id,
            COALESCE(i.impressions, 0) AS impressions,
            COALESCE(c.clicks, 0) AS clicks,
            CASE
              WHEN COALESCE(i.impressions, 0) > 0 THEN c.clicks::numeric / NULLIF(i.impressions, 0)
              ELSE 0::numeric
            END AS ctr
          FROM ids
          LEFT JOIN imp i ON i.ad_id = ids.ad_id
          LEFT JOIN clk c ON c.ad_id = ids.ad_id
        )
        SELECT jsonb_agg(
          jsonb_build_object(
            'adId',
            r.ad_id,
            'impressions',
            r.impressions,
            'clicks',
            r.clicks,
            'ctr',
            CASE
              WHEN r.impressions > 0 THEN
                ROUND(r.clicks::numeric / r.impressions * 100, 2)::text
              ELSE '0.00'
            END
          )
          ORDER BY r.ctr DESC
        )
        FROM (
          SELECT *
          FROM ranked
          ORDER BY ctr DESC
          LIMIT 5
        ) r
      ),
      '[]'::jsonb
    ),
    'trafficSources',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'source',
            src,
            'count',
            cnt
          )
          ORDER BY cnt DESC
        )
        FROM (
          SELECT
            CASE
              WHEN traffic_source = 'search' THEN 'search'
              ELSE 'external'
            END AS src,
            COUNT(*)::int AS cnt
          FROM page_views
          WHERE viewed_at >= p_range_start
            AND viewed_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
            AND traffic_source IS NOT NULL
            AND traffic_source <> 'internal'
          GROUP BY 1
        ) z
      ),
      '[]'::jsonb
    ),
    'deviceBreakdown',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'device',
            COALESCE(device_type, 'unknown'),
            'count',
            cnt::int
          )
          ORDER BY cnt DESC
        )
        FROM (
          SELECT COALESCE(device_type, 'unknown') AS device_type, COUNT(*) AS cnt
          FROM page_views
          WHERE viewed_at >= p_range_start
            AND viewed_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          GROUP BY 1
        ) d
      ),
      '[]'::jsonb
    ),
    'topCities',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'city',
            city,
            'count',
            c_cnt::int
          )
          ORDER BY c_cnt DESC
        )
        FROM (
          SELECT city, COUNT(DISTINCT session_id)::int AS c_cnt
          FROM page_views
          WHERE viewed_at >= p_range_start
            AND viewed_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
            AND city IS NOT NULL
            AND city NOT IN ('Unknown', 'Development', 'Santa Clara', 'San Jose', 'Mountain View', 'Palo Alto')
            AND NOT (
              state = 'California'
              AND city IN ('Santa Clara', 'San Jose', 'Mountain View', 'Palo Alto', 'Sunnyvale')
            )
          GROUP BY city
          ORDER BY c_cnt DESC
          LIMIT 50
        ) gc
      ),
      '[]'::jsonb
    ),
    'topStates',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'state',
            state,
            'count',
            c_cnt::int
          )
          ORDER BY c_cnt DESC
        )
        FROM (
          SELECT state, COUNT(DISTINCT session_id)::int AS c_cnt
          FROM page_views
          WHERE viewed_at >= p_range_start
            AND viewed_at <= p_range_end
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
            AND state IS NOT NULL
            AND state NOT IN ('Unknown', 'Local')
            AND NOT (
              state = 'California'
              AND city IS NOT NULL
              AND city IN ('Santa Clara', 'San Jose', 'Mountain View', 'Palo Alto', 'Sunnyvale', 'Development')
            )
          GROUP BY state
          ORDER BY c_cnt DESC
          LIMIT 50
        ) gs
      ),
      '[]'::jsonb
    ),
    'chart',
    COALESCE(v_chart, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics_dashboard(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  int,
  uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_analytics_dashboard(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  int,
  uuid
) TO service_role;

COMMENT ON FUNCTION public.get_admin_analytics_dashboard(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  int,
  uuid
) IS
  'Admin analytics aggregates in one round trip (optional tenant scope via p_tenant_id); callable only with service role.';
