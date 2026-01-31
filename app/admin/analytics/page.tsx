"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  // Executive metrics
  const [totalPageViews, setTotalPageViews] = useState(0);
  const [avgSessionDuration, setAvgSessionDuration] = useState(0);
  const [totalAdImpressions, setTotalAdImpressions] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [revenueEst, setRevenueEst] = useState(0);
  
  // Content metrics
  const [topArticles, setTopArticles] = useState<any[]>([]);
  const [sectionPerformance, setSectionPerformance] = useState<any[]>([]);
  const [authorPerformance, setAuthorPerformance] = useState<any[]>([]);
  const [avgReadingTime, setAvgReadingTime] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  
  // Ad metrics
  const [adSlotPerformance, setAdSlotPerformance] = useState<any[]>([]);
  const [topAds, setTopAds] = useState<any[]>([]);
  const [adViewability, setAdViewability] = useState(0);
  const [avgTimeInViewport, setAvgTimeInViewport] = useState(0);
  
  // Traffic metrics
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAllAnalytics();
    }
  }, [user, timeRange]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);
  }

  async function loadAllAnalytics() {
    try {
      setLoading(true);
      
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate = new Date('2020-01-01'); // All time
      }

      // === EXECUTIVE METRICS ===
      
      // Total page views
      const { count: pageViewCount } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('viewed_at', startDate.toISOString());
      setTotalPageViews(pageViewCount || 0);

      // Average session duration
      const { data: sessions } = await supabase
        .from('page_views')
        .select('time_spent_seconds, session_id')
        .gte('viewed_at', startDate.toISOString())
        .gt('time_spent_seconds', 0);
      
      if (sessions && sessions.length > 0) {
        const uniqueSessions = [...new Set(sessions.map(s => s.session_id))];
        const totalTime = sessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
        setAvgSessionDuration(Math.round(totalTime / uniqueSessions.length));
      }

      // Ad impressions
      const { count: impressionCount } = await supabase
        .from('ad_impressions')
        .select('*', { count: 'exact', head: true })
        .gte('viewed_at', startDate.toISOString());
      setTotalAdImpressions(impressionCount || 0);

      // Calculate revenue estimate (assuming $5 CPM)
      const estimatedRevenue = ((impressionCount || 0) / 1000) * 5;
      setRevenueEst(estimatedRevenue);

      // Engagement rate (clicks / views)
      const { count: clickCount } = await supabase
        .from('ad_clicks')
        .select('*', { count: 'exact', head: true })
        .gte('clicked_at', startDate.toISOString());
      
      const engRate = pageViewCount && pageViewCount > 0 
        ? ((clickCount || 0) / pageViewCount * 100)
        : 0;
      setEngagementRate(engRate);

      // === CONTENT PERFORMANCE ===
      
      // Top articles by views with time spent
      const { data: articles } = await supabase
        .from('articles')
        .select('id, title, slug, section, author_name, view_count, share_count')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(10);

      // Get time spent data for these articles
      if (articles) {
        const articlesWithTime = await Promise.all(
          articles.map(async (article) => {
            const { data: scrollData } = await supabase
              .from('article_scroll_data')
              .select('time_spent_seconds')
              .eq('article_id', article.id)
              .gte('created_at', startDate.toISOString());
            
            const avgTime = scrollData && scrollData.length > 0
              ? Math.round(scrollData.reduce((sum, s) => sum + s.time_spent_seconds, 0) / scrollData.length)
              : 0;
            
            return { ...article, avgTimeSpent: avgTime };
          })
        );
        setTopArticles(articlesWithTime);
      }

      // Article completion rate
      const { data: allScrollData } = await supabase
        .from('article_scroll_data')
        .select('max_scroll_percent, time_spent_seconds')
        .gte('created_at', startDate.toISOString());
      
      if (allScrollData && allScrollData.length > 0) {
        const completed = allScrollData.filter(s => s.max_scroll_percent >= 90).length;
        setCompletionRate((completed / allScrollData.length) * 100);
        
        const totalReadTime = allScrollData.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
        setAvgReadingTime(Math.round(totalReadTime / allScrollData.length));
      }

      // Section performance
      const { data: sectionViews } = await supabase
        .from('page_views')
        .select('view_type, article_id, time_spent_seconds')
        .eq('view_type', 'section')
        .gte('viewed_at', startDate.toISOString());

      // Get section clicks
      const { data: sectionClicksData } = await supabase
        .from('section_clicks')
        .select('section_name')
        .gte('clicked_at', startDate.toISOString());

      // Aggregate section data
      const sectionMap: Record<string, { views: number; clicks: number; timeSpent: number }> = {};
      sectionViews?.forEach(sv => {
        const section = 'section'; // Would need to parse from URL or add section field
        if (!sectionMap[section]) {
          sectionMap[section] = { views: 0, clicks: 0, timeSpent: 0 };
        }
        sectionMap[section].views++;
        sectionMap[section].timeSpent += sv.time_spent_seconds || 0;
      });

      sectionClicksData?.forEach(sc => {
        if (!sectionMap[sc.section_name]) {
          sectionMap[sc.section_name] = { views: 0, clicks: 0, timeSpent: 0 };
        }
        sectionMap[sc.section_name].clicks++;
      });

      const sectionPerfArray = Object.entries(sectionMap).map(([name, data]) => ({
        name,
        views: data.views,
        clicks: data.clicks,
        avgTimeSpent: data.views > 0 ? Math.round(data.timeSpent / data.views) : 0,
      }));
      setSectionPerformance(sectionPerfArray.slice(0, 5));

      // Author performance
      const { data: authorClicksData } = await supabase
        .from('author_clicks')
        .select('author_name')
        .gte('clicked_at', startDate.toISOString());

      const authorMap: Record<string, number> = {};
      authorClicksData?.forEach(ac => {
        authorMap[ac.author_name] = (authorMap[ac.author_name] || 0) + 1;
      });

      const authorPerfArray = Object.entries(authorMap)
        .map(([name, clicks]) => ({ name, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
      setAuthorPerformance(authorPerfArray);

      // === AD PERFORMANCE ===
      
      // Ad performance by slot
      const { data: allImpressions } = await supabase
        .from('ad_impressions')
        .select('ad_slot, ad_id, was_viewed, view_duration_seconds, viewport_position')
        .gte('viewed_at', startDate.toISOString());

      const { data: allClicks } = await supabase
        .from('ad_clicks')
        .select('ad_slot, ad_id')
        .gte('clicked_at', startDate.toISOString());

      // Group by slot
      const slotMap: Record<string, any> = {};
      allImpressions?.forEach(imp => {
        if (!slotMap[imp.ad_slot]) {
          slotMap[imp.ad_slot] = {
            slot: imp.ad_slot,
            impressions: 0,
            viewed: 0,
            clicks: 0,
            totalViewTime: 0,
            aboveFold: 0,
            midPage: 0,
            belowFold: 0,
          };
        }
        slotMap[imp.ad_slot].impressions++;
        if (imp.was_viewed) slotMap[imp.ad_slot].viewed++;
        slotMap[imp.ad_slot].totalViewTime += imp.view_duration_seconds || 0;
        
        if (imp.viewport_position === 'above-fold') slotMap[imp.ad_slot].aboveFold++;
        else if (imp.viewport_position === 'mid-page') slotMap[imp.ad_slot].midPage++;
        else if (imp.viewport_position === 'below-fold') slotMap[imp.ad_slot].belowFold++;
      });

      allClicks?.forEach(click => {
        if (slotMap[click.ad_slot]) {
          slotMap[click.ad_slot].clicks++;
        }
      });

      const slotPerfArray = Object.values(slotMap).map((slot: any) => ({
        ...slot,
        ctr: slot.impressions > 0 ? (slot.clicks / slot.impressions * 100).toFixed(2) : '0.00',
        viewability: slot.impressions > 0 ? (slot.viewed / slot.impressions * 100).toFixed(2) : '0.00',
        avgViewTime: slot.viewed > 0 ? Math.round(slot.totalViewTime / slot.viewed) : 0,
      }));
      setAdSlotPerformance(slotPerfArray);

      // Overall ad viewability
      const totalViewed = allImpressions?.filter(i => i.was_viewed).length || 0;
      const totalImps = allImpressions?.length || 0;
      setAdViewability(totalImps > 0 ? (totalViewed / totalImps * 100) : 0);

      // Average time in viewport
      const totalViewTime = allImpressions?.reduce((sum, i) => sum + (i.view_duration_seconds || 0), 0) || 0;
      setAvgTimeInViewport(totalViewed > 0 ? Math.round(totalViewTime / totalViewed) : 0);

      // Top performing ads
      const adMap: Record<string, any> = {};
      allImpressions?.forEach(imp => {
        if (!adMap[imp.ad_id]) {
          adMap[imp.ad_id] = { adId: imp.ad_id, impressions: 0, clicks: 0 };
        }
        adMap[imp.ad_id].impressions++;
      });

      allClicks?.forEach(click => {
        if (adMap[click.ad_id]) {
          adMap[click.ad_id].clicks++;
        }
      });

      const topAdsArray = Object.values(adMap)
        .map((ad: any) => ({
          ...ad,
          ctr: ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00',
        }))
        .sort((a: any, b: any) => parseFloat(b.ctr) - parseFloat(a.ctr))
        .slice(0, 5);
      setTopAds(topAdsArray);

      // === TRAFFIC QUALITY ===
      
      // Traffic sources
      const { data: trafficData } = await supabase
        .from('page_views')
        .select('traffic_source')
        .gte('viewed_at', startDate.toISOString());

      const sourceMap: Record<string, number> = {};
      trafficData?.forEach(t => {
        const source = t.traffic_source || 'unknown';
        sourceMap[source] = (sourceMap[source] || 0) + 1;
      });

      const sourcesArray = Object.entries(sourceMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
      setTrafficSources(sourcesArray);

      // Device breakdown
      const { data: deviceData } = await supabase
        .from('page_views')
        .select('device_type')
        .gte('viewed_at', startDate.toISOString());

      const deviceMap: Record<string, number> = {};
      deviceData?.forEach(d => {
        const device = d.device_type || 'unknown';
        deviceMap[device] = (deviceMap[device] || 0) + 1;
      });

      const devicesArray = Object.entries(deviceMap)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);
      setDeviceBreakdown(devicesArray);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
          <p className="mt-4 text-[color:var(--color-medium)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--color-dark)] mb-2">Analytics Dashboard</h1>
            <p className="text-[color:var(--color-medium)]">Comprehensive performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-100 rounded-md transition"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* === EXECUTIVE SUMMARY === */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-[color:var(--color-dark)]">Executive Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Page Views"
              value={totalPageViews.toLocaleString()}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              color="blue"
            />
            <MetricCard
              title="Avg Session Duration"
              value={`${Math.floor(avgSessionDuration / 60)}:${String(avgSessionDuration % 60).padStart(2, '0')}`}
              subtitle="minutes"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
            />
            <MetricCard
              title="Revenue Potential"
              value={`$${revenueEst.toFixed(2)}`}
              subtitle={`${totalAdImpressions.toLocaleString()} impressions`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="purple"
            />
            <MetricCard
              title="Engagement Rate"
              value={`${engagementRate.toFixed(2)}%`}
              subtitle="clicks/views"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              color="orange"
            />
          </div>
        </div>

        {/* === CONTENT PERFORMANCE === */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-bold text-[color:var(--color-dark)]">Content Performance</h2>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-blue-500">
              <div className="text-2xl font-black text-blue-600 mb-1">
                {avgReadingTime > 0 ? `${Math.floor(avgReadingTime / 60)}:${String(avgReadingTime % 60).padStart(2, '0')}` : '0:00'}
              </div>
              <div className="text-sm font-semibold text-gray-600">Avg Reading Time</div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-green-500">
              <div className="text-2xl font-black text-green-600 mb-1">
                {completionRate.toFixed(1)}%
              </div>
              <div className="text-sm font-semibold text-gray-600">Article Completion Rate</div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-purple-500">
              <div className="text-2xl font-black text-purple-600 mb-1">
                {topArticles.length}
              </div>
              <div className="text-sm font-semibold text-gray-600">Published Articles</div>
            </div>
          </div>

          {/* Top Articles Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)]">Top Articles</h3>
            </div>
            {topArticles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No article data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topArticles.slice(0, 5).map((article, i) => (
                      <tr key={article.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">#{i + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                          <Link href={`/article/${article.slug}`} target="_blank" className="hover:text-blue-600 hover:underline">
                            {article.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {article.view_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {article.avgTimeSpent > 0 ? `${Math.floor(article.avgTimeSpent / 60)}:${String(article.avgTimeSpent % 60).padStart(2, '0')}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {article.share_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section & Author Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Top Sections</h3>
              {sectionPerformance.length === 0 ? (
                <p className="text-sm text-gray-500">No section data yet</p>
              ) : (
                <div className="space-y-3">
                  {sectionPerformance.map((section) => (
                    <div key={section.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">{section.name}</span>
                      <div className="text-sm text-gray-600">
                        {section.clicks} clicks • {section.views} views
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Top Authors</h3>
              {authorPerformance.length === 0 ? (
                <p className="text-sm text-gray-500">No author click data yet</p>
              ) : (
                <div className="space-y-3">
                  {authorPerformance.map((author) => (
                    <div key={author.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{author.name}</span>
                      <span className="text-sm font-semibold text-gray-900">{author.clicks} clicks</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === AD PERFORMANCE === */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <h2 className="text-xl font-bold text-[color:var(--color-dark)]">Advertisement Performance</h2>
          </div>

          {/* Ad quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-orange-500">
              <div className="text-2xl font-black text-orange-600 mb-1">
                {adViewability.toFixed(1)}%
              </div>
              <div className="text-sm font-semibold text-gray-600">Ad Viewability Rate</div>
              <div className="text-xs text-gray-500 mt-1">Ads actually seen by users</div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-pink-500">
              <div className="text-2xl font-black text-pink-600 mb-1">
                {avgTimeInViewport}s
              </div>
              <div className="text-sm font-semibold text-gray-600">Avg Time in Viewport</div>
              <div className="text-xs text-gray-500 mt-1">How long ads are visible</div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-green-500">
              <div className="text-2xl font-black text-green-600 mb-1">
                ${revenueEst.toFixed(2)}
              </div>
              <div className="text-sm font-semibold text-gray-600">Est. Revenue (CPM $5)</div>
              <div className="text-xs text-gray-500 mt-1">Based on impressions</div>
            </div>
          </div>

          {/* Ad Slot Performance Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)]">Performance by Ad Slot</h3>
            </div>
            {adSlotPerformance.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No ad impression data yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impressions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viewed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viewability</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg View Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adSlotPerformance.map((slot) => (
                      <tr key={slot.slot} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{slot.slot}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{slot.impressions}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{slot.viewed}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{slot.clicks}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">{slot.ctr}%</td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600">{slot.viewability}%</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{slot.avgViewTime}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* === TRAFFIC QUALITY === */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-[color:var(--color-dark)]">Traffic Quality</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Traffic Sources</h3>
              {trafficSources.length === 0 ? (
                <p className="text-sm text-gray-500">No traffic data yet</p>
              ) : (
                <div className="space-y-3">
                  {trafficSources.map((source) => {
                    const total = trafficSources.reduce((sum, s) => sum + s.count, 0);
                    const percentage = ((source.count / total) * 100).toFixed(1);
                    return (
                      <div key={source.source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 capitalize">{source.source}</span>
                          <span className="text-gray-900 font-semibold">{source.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device Breakdown */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Device Distribution</h3>
              {deviceBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500">No device data yet</p>
              ) : (
                <div className="space-y-3">
                  {deviceBreakdown.map((device) => {
                    const total = deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
                    const percentage = ((device.count / total) * 100).toFixed(1);
                    return (
                      <div key={device.device}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 capitalize">{device.device}</span>
                          <span className="text-gray-900 font-semibold">{device.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle,
  icon,
  color 
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  const textColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white mb-3`}>
        {icon}
      </div>
      <div className={`text-3xl font-black mb-1 ${textColors[color]}`}>
        {value}
      </div>
      <div className="text-sm font-semibold text-gray-600 mb-1">
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  );
}
