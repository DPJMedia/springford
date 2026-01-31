-- ============================================
-- Clean Up Test/Development Location Data
-- ============================================
-- This removes location entries that are likely from development
-- or proxy services (Santa Clara, CA is a common fallback location)

-- Update page_views to set test locations to NULL
UPDATE page_views
SET 
  city = NULL,
  state = NULL,
  country = NULL,
  postal_code = NULL
WHERE 
  -- Santa Clara area (common proxy/CDN location)
  city IN ('Santa Clara', 'San Jose', 'Mountain View', 'Palo Alto', 'Sunnyvale')
  OR
  -- Development fallback values
  city = 'Development'
  OR
  state = 'Local'
  OR
  city = 'Unknown';

-- Update ad_impressions to set test locations to NULL
UPDATE ad_impressions
SET 
  city = NULL,
  state = NULL,
  country = NULL,
  postal_code = NULL
WHERE 
  -- Santa Clara area (common proxy/CDN location)
  city IN ('Santa Clara', 'San Jose', 'Mountain View', 'Palo Alto', 'Sunnyvale')
  OR
  -- Development fallback values
  city = 'Development'
  OR
  state = 'Local'
  OR
  city = 'Unknown';

-- Verify the cleanup
SELECT 
  city,
  state,
  COUNT(*) as count
FROM page_views
WHERE city IS NOT NULL
GROUP BY city, state
ORDER BY count DESC
LIMIT 20;
