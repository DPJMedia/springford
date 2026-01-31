import { createClient } from "@/lib/supabase/client";

// Cache location data in memory to avoid repeated API calls
let cachedLocation: {
  city: string;
  state: string;
  country: string;
  postal_code: string;
} | null = null;

// Session ID management
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

// Fetch user location from server-side API
export async function getLocation(): Promise<{
  city: string;
  state: string;
  country: string;
  postal_code: string;
}> {
  if (typeof window === 'undefined') {
    return { city: 'Unknown', state: 'Unknown', country: 'Unknown', postal_code: '' };
  }

  // Return cached location if available
  if (cachedLocation) {
    return cachedLocation;
  }

  try {
    const response = await fetch('/api/geolocation');
    if (!response.ok) throw new Error('Geolocation failed');
    
    const location = await response.json();
    cachedLocation = location;
    return location;
  } catch (error) {
    console.error('Failed to get location:', error);
    return { city: 'Unknown', state: 'Unknown', country: 'Unknown', postal_code: '' };
  }
}

// Device detection
export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Traffic source detection - Simplified to Search vs External
export function getTrafficSource(): { source: string; referrer: string } {
  if (typeof window === 'undefined') return { source: 'external', referrer: '' };
  
  const referrer = document.referrer;
  const currentHost = window.location.hostname;
  
  // If no referrer or internal navigation, count as external (direct visit)
  if (!referrer) return { source: 'external', referrer: '' };
  
  const referrerUrl = new URL(referrer);
  
  // Skip internal navigation (don't count as traffic source)
  if (referrerUrl.hostname === currentHost) {
    return { source: 'internal', referrer }; // Will be filtered out in analytics
  }
  
  // Search engines = "search"
  if (/google|bing|yahoo|duckduckgo|baidu|yandex/.test(referrerUrl.hostname)) {
    return { source: 'search', referrer };
  }
  
  // Everything else = "external" (social media, other websites, shared links, etc.)
  return { source: 'external', referrer };
}

// Get UTM parameters
export function getUTMParams(): { source?: string; medium?: string; campaign?: string } {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
  };
}

// Track page view
export async function trackPageView(data: {
  viewType: 'article' | 'homepage' | 'section' | 'author' | 'tag' | 'other';
  articleId?: string;
  userId?: string;
}) {
  const supabase = createClient();
  const sessionId = getSessionId();
  const deviceType = getDeviceType();
  const { source: trafficSource, referrer } = getTrafficSource();
  const utmParams = getUTMParams();
  const location = await getLocation();
  
  try {
    await supabase.from('page_views').insert({
      article_id: data.articleId || null,
      user_id: data.userId || null,
      session_id: sessionId,
      view_type: data.viewType,
      referrer_url: referrer,
      traffic_source: trafficSource,
      utm_source: utmParams.source || null,
      utm_medium: utmParams.medium || null,
      utm_campaign: utmParams.campaign || null,
      device_type: deviceType,
      user_agent: navigator.userAgent,
      city: location.city,
      state: location.state,
      country: location.country,
      postal_code: location.postal_code,
      viewed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

// Update page view with time spent and scroll data
export async function updatePageView(data: {
  sessionId: string;
  articleId?: string;
  timeSpentSeconds: number;
  scrollDepthPercent: number;
  maxScrollDepth: number;
  completedArticle: boolean;
}) {
  const supabase = createClient();
  
  try {
    // Find the most recent page view for this session and article
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('id')
      .eq('session_id', data.sessionId)
      .eq('article_id', data.articleId || null)
      .order('viewed_at', { ascending: false })
      .limit(1);
    
    if (pageViews && pageViews.length > 0) {
      await supabase
        .from('page_views')
        .update({
          time_spent_seconds: data.timeSpentSeconds,
          scroll_depth_percent: data.scrollDepthPercent,
          max_scroll_depth: data.maxScrollDepth,
          completed_article: data.completedArticle,
          exit_page: true,
        })
        .eq('id', pageViews[0].id);
    }
  } catch (error) {
    console.error('Failed to update page view:', error);
  }
}

// Track article scroll data
export async function trackArticleScrollData(data: {
  articleId: string;
  sessionId: string;
  scrollCheckpoints: Record<number, number>; // { 10: timestamp, 25: timestamp, etc. }
  maxScrollPercent: number;
  articleLengthPixels: number;
  timeSpentSeconds: number;
  abandonedAtPercent: number;
}) {
  const supabase = createClient();
  
  try {
    await supabase.from('article_scroll_data').insert({
      article_id: data.articleId,
      session_id: data.sessionId,
      scroll_checkpoints: data.scrollCheckpoints,
      max_scroll_percent: data.maxScrollPercent,
      article_length_pixels: data.articleLengthPixels,
      time_spent_seconds: data.timeSpentSeconds,
      abandoned_at_percent: data.abandonedAtPercent,
    });
  } catch (error) {
    console.error('Failed to track article scroll data:', error);
  }
}

// Track ad impression
export async function trackAdImpression(data: {
  adId: string;
  adSlot: string;
  userId?: string;
  wasViewed: boolean;
  viewDurationSeconds?: number;
  viewportPosition?: 'above-fold' | 'mid-page' | 'below-fold';
  scrollDepthWhenViewed?: number;
}) {
  const supabase = createClient();
  const sessionId = getSessionId();
  const deviceType = getDeviceType();
  const location = await getLocation();
  
  try {
    await supabase.from('ad_impressions').insert({
      ad_id: data.adId,
      ad_slot: data.adSlot,
      user_id: data.userId || null,
      session_id: sessionId,
      page_url: window.location.href,
      device_type: deviceType,
      city: location.city,
      state: location.state,
      country: location.country,
      postal_code: location.postal_code,
      was_viewed: data.wasViewed,
      view_duration_seconds: data.viewDurationSeconds || 0,
      viewport_position: data.viewportPosition || null,
      scroll_depth_when_viewed: data.scrollDepthWhenViewed || null,
    });
  } catch (error) {
    console.error('Failed to track ad impression:', error);
  }
}

// Track ad click
export async function trackAdClick(data: {
  adId: string;
  adSlot: string;
  userId?: string;
  destinationUrl: string;
}) {
  const supabase = createClient();
  const sessionId = getSessionId();
  const deviceType = getDeviceType();
  
  try {
    await supabase.from('ad_clicks').insert({
      ad_id: data.adId,
      ad_slot: data.adSlot,
      user_id: data.userId || null,
      session_id: sessionId,
      page_url: window.location.href,
      device_type: deviceType,
      destination_url: data.destinationUrl,
    });
  } catch (error) {
    console.error('Failed to track ad click:', error);
  }
}

// Track author click
export async function trackAuthorClick(data: {
  authorName: string;
  clickedFromPage: string;
  articleId?: string;
  userId?: string;
}) {
  const supabase = createClient();
  const sessionId = getSessionId();
  
  try {
    await supabase.from('author_clicks').insert({
      author_name: data.authorName,
      clicked_from_page: data.clickedFromPage,
      article_id: data.articleId || null,
      user_id: data.userId || null,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Failed to track author click:', error);
  }
}

// Track section click
export async function trackSectionClick(data: {
  sectionName: string;
  clickedFromPage: string;
  userId?: string;
}) {
  const supabase = createClient();
  const sessionId = getSessionId();
  
  try {
    await supabase.from('section_clicks').insert({
      section_name: data.sectionName,
      clicked_from_page: data.clickedFromPage,
      user_id: data.userId || null,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Failed to track section click:', error);
  }
}

// Calculate viewport position
export function calculateViewportPosition(element: HTMLElement): 'above-fold' | 'mid-page' | 'below-fold' {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const elementTop = rect.top;
  
  if (elementTop < viewportHeight) {
    return 'above-fold';
  } else if (elementTop < viewportHeight * 2) {
    return 'mid-page';
  } else {
    return 'below-fold';
  }
}

// Calculate scroll depth percentage
export function calculateScrollDepth(): number {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
  return Math.min(Math.round(scrollPercent), 100);
}
