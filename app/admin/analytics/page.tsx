"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

// Register Chart.js components and zoom plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

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
  
  // Location metrics
  const [topCities, setTopCities] = useState<any[]>([]);
  const [topStates, setTopStates] = useState<any[]>([]);
  
  // Chart data
  const [pageViewsOverTime, setPageViewsOverTime] = useState<any>(null);
  const [homepageViewsOverTime, setHomepageViewsOverTime] = useState<any>(null);
  const [articleViewsOverTime, setArticleViewsOverTime] = useState<any>(null);
  const [trafficChartData, setTrafficChartData] = useState<any>(null);
  const [deviceChartData, setDeviceChartData] = useState<any>(null);
  
  // Chart controls
  const [chartTimeRange, setChartTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [yAxisMax, setYAxisMax] = useState(1000);
  const [showHomepageViews, setShowHomepageViews] = useState(true);
  const [showArticleViews, setShowArticleViews] = useState(true);
  const [showTrafficChart, setShowTrafficChart] = useState(false);
  const [showDeviceChart, setShowDeviceChart] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAllAnalytics();
      loadChartData(chartTimeRange);
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

      // === LOCATION DATA ===
      
      // Top cities
      const { data: cityData } = await supabase
        .from('page_views')
        .select('city')
        .gte('viewed_at', startDate.toISOString())
        .not('city', 'is', null);

      const cityMap: Record<string, number> = {};
      cityData?.forEach(c => {
        if (c.city && c.city !== 'Unknown') {
          cityMap[c.city] = (cityMap[c.city] || 0) + 1;
        }
      });

      const citiesArray = Object.entries(cityMap)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopCities(citiesArray);

      // Top states
      const { data: stateData } = await supabase
        .from('page_views')
        .select('state')
        .gte('viewed_at', startDate.toISOString())
        .not('state', 'is', null);

      const stateMap: Record<string, number> = {};
      stateData?.forEach(s => {
        if (s.state && s.state !== 'Unknown') {
          stateMap[s.state] = (stateMap[s.state] || 0) + 1;
        }
      });

      const statesArray = Object.entries(stateMap)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopStates(statesArray);

      // === CHART DATA ===
      // This will be loaded separately based on chartTimeRange
      loadChartData(chartTimeRange);

      // Traffic sources doughnut chart
      if (sourcesArray.length > 0) {
        setTrafficChartData({
          labels: sourcesArray.map(s => s.source.charAt(0).toUpperCase() + s.source.slice(1)),
          datasets: [{
            data: sourcesArray.map(s => s.count),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
            ],
          }],
        });
      }

      // Device breakdown pie chart
      if (devicesArray.length > 0) {
        setDeviceChartData({
          labels: devicesArray.map(d => d.device.charAt(0).toUpperCase() + d.device.slice(1)),
          datasets: [{
            data: devicesArray.map(d => d.count),
            backgroundColor: [
              'rgba(16, 185, 129, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(245, 158, 11, 0.8)',
            ],
          }],
        });
      }

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChartData(period: '24h' | '7d' | '30d' | '90d') {
    try {
      const now = new Date();
      let chartStartDate = new Date();
      let daysToShow = 7;
      let timeFormat: 'hour' | 'day' = 'day';
      
      switch (period) {
        case '24h':
          chartStartDate.setHours(now.getHours() - 24);
          daysToShow = 24;
          timeFormat = 'hour';
          break;
        case '7d':
          chartStartDate.setDate(now.getDate() - 7);
          daysToShow = 7;
          break;
        case '30d':
          chartStartDate.setDate(now.getDate() - 30);
          daysToShow = 30;
          break;
        case '90d':
          chartStartDate.setDate(now.getDate() - 90);
          daysToShow = 90;
          break;
      }

      // Fetch all page views for the period
      const { data: allViews } = await supabase
        .from('page_views')
        .select('viewed_at, view_type')
        .gte('viewed_at', chartStartDate.toISOString());

      // Initialize data structures
      const homepageByTime: Record<string, number> = {};
      const articlesByTime: Record<string, number> = {};
      
      if (timeFormat === 'hour') {
        // For 24h view, group by hour
        for (let i = 23; i >= 0; i--) {
          const date = new Date();
          date.setHours(date.getHours() - i);
          const hourStr = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
          homepageByTime[hourStr] = 0;
          articlesByTime[hourStr] = 0;
        }
      } else {
        // For day views, group by day
        for (let i = daysToShow - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          homepageByTime[dateStr] = 0;
          articlesByTime[dateStr] = 0;
        }
      }

      // Populate data
      allViews?.forEach(v => {
        const key = timeFormat === 'hour' 
          ? v.viewed_at.slice(0, 13) 
          : v.viewed_at.split('T')[0];
        
        if (v.view_type === 'homepage') {
          if (homepageByTime[key] !== undefined) {
            homepageByTime[key]++;
          }
        } else if (v.view_type === 'article') {
          if (articlesByTime[key] !== undefined) {
            articlesByTime[key]++;
          }
        }
      });

      // Format labels
      const labels = Object.keys(homepageByTime).map(k => {
        if (timeFormat === 'hour') {
          const date = new Date(k + ':00:00Z');
          return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        } else {
          return new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      });

      setHomepageViewsOverTime(Object.values(homepageByTime));
      setArticleViewsOverTime(Object.values(articlesByTime));
      
      // Build chart data
      const datasets = [];
      if (showHomepageViews) {
        datasets.push({
          label: 'Homepage Views',
          data: Object.values(homepageByTime),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        });
      }
      if (showArticleViews) {
        datasets.push({
          label: 'Article Views',
          data: Object.values(articlesByTime),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        });
      }

      setPageViewsOverTime({
        labels,
        datasets,
      });

    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  }

  // Zoom functions
  function zoomIn() {
    if (yAxisMax > 10) {
      const newMax = yAxisMax === 1000 ? 500 : yAxisMax === 500 ? 250 : yAxisMax === 250 ? 100 : yAxisMax === 100 ? 50 : yAxisMax === 50 ? 25 : 10;
      setYAxisMax(newMax);
    }
  }

  function zoomOut() {
    if (yAxisMax < 1000) {
      const newMax = yAxisMax === 10 ? 25 : yAxisMax === 25 ? 50 : yAxisMax === 50 ? 100 : yAxisMax === 100 ? 250 : yAxisMax === 250 ? 500 : 1000;
      setYAxisMax(newMax);
    }
  }

  // Reload chart when controls change
  useEffect(() => {
    if (user) {
      loadChartData(chartTimeRange);
    }
  }, [chartTimeRange, showHomepageViews, showArticleViews, user]);

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

        {/* === PAGE VIEWS CHART === */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-xl font-bold text-[color:var(--color-dark)]">Page Views Chart</h2>
            </div>
          </div>

          {/* Chart Controls */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {/* Time Period Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Time Period:</label>
                <select
                  value={chartTimeRange}
                  onChange={(e) => setChartTimeRange(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Y-Axis:</label>
                <button
                  onClick={zoomOut}
                  disabled={yAxisMax >= 1000}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium rounded-md transition"
                >
                  Zoom Out
                </button>
                <span className="text-sm font-semibold text-gray-700 min-w-[80px] text-center">0 - {yAxisMax}</span>
                <button
                  onClick={zoomIn}
                  disabled={yAxisMax <= 10}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium rounded-md transition"
                >
                  Zoom In
                </button>
              </div>

              {/* View Type Checkboxes */}
              <div className="flex items-center gap-4 ml-auto">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHomepageViews}
                    onChange={(e) => setShowHomepageViews(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Homepage Views
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showArticleViews}
                    onChange={(e) => setShowArticleViews(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Article Views
                  </span>
                </label>
              </div>
            </div>

            {/* Chart */}
            {pageViewsOverTime && (showHomepageViews || showArticleViews) ? (
              <div className="h-96">
                <Line 
                  data={pageViewsOverTime}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'point',
                      intersect: true,
                    },
                    plugins: {
                      legend: { 
                        display: false,
                      },
                      tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                          label: function(context: any) {
                            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} views`;
                          }
                        }
                      },
                    },
                    scales: {
                      y: { 
                        beginAtZero: true,
                        max: yAxisMax,
                        ticks: {
                          font: { size: 12 },
                          callback: function(value: any) {
                            return value.toLocaleString();
                          },
                          stepSize: yAxisMax / 10,
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                        },
                      },
                      x: {
                        ticks: {
                          font: { size: 12 },
                          maxRotation: 45,
                          minRotation: 0,
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500">
                <p>Please select at least one view type to display the chart</p>
              </div>
            )}
          </div>
        </div>

        {/* === LOCATION INSIGHTS === */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[color:var(--color-riviera-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-xl font-bold text-[color:var(--color-dark)]">Geographic Insights</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Cities */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Top Cities</h3>
              {topCities.length === 0 ? (
                <p className="text-sm text-gray-500">No city data available yet</p>
              ) : (
                <div className="space-y-3">
                  {topCities.map((city, index) => {
                    const total = topCities.reduce((sum, c) => sum + c.count, 0);
                    const percentage = ((city.count / total) * 100).toFixed(1);
                    return (
                      <div key={city.city}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            #{index + 1} {city.city}
                          </span>
                          <span className="text-gray-900 font-semibold">{city.count} ({percentage}%)</span>
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

            {/* Top States */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Top States/Regions</h3>
              {topStates.length === 0 ? (
                <p className="text-sm text-gray-500">No state data available yet</p>
              ) : (
                <div className="space-y-3">
                  {topStates.map((state, index) => {
                    const total = topStates.reduce((sum, s) => sum + s.count, 0);
                    const percentage = ((state.count / total) * 100).toFixed(1);
                    return (
                      <div key={state.state}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            #{index + 1} {state.state}
                          </span>
                          <span className="text-gray-900 font-semibold">{state.count} ({percentage}%)</span>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)]">Traffic Sources</h3>
                <button
                  onClick={() => setShowTrafficChart(!showTrafficChart)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                >
                  {showTrafficChart ? 'Hide Chart' : 'View Chart'}
                </button>
              </div>
              
              {showTrafficChart && trafficChartData ? (
                <div className="h-80 flex items-center justify-center mb-4">
                  <Doughnut 
                    data={trafficChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          position: 'bottom',
                          labels: {
                            font: { size: 12 },
                            padding: 15,
                            usePointStyle: true,
                          },
                        },
                        tooltip: {
                          enabled: true,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleFont: { size: 13 },
                          bodyFont: { size: 12 },
                          padding: 10,
                          callbacks: {
                            label: function(context: any) {
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                          }
                        },
                      },
                    }}
                  />
                </div>
              ) : null}
              
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)]">Device Distribution</h3>
                <button
                  onClick={() => setShowDeviceChart(!showDeviceChart)}
                  className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition"
                >
                  {showDeviceChart ? 'Hide Chart' : 'View Chart'}
                </button>
              </div>
              
              {showDeviceChart && deviceChartData ? (
                <div className="h-80 flex items-center justify-center mb-4">
                  <Doughnut 
                    data={deviceChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          position: 'bottom',
                          labels: {
                            font: { size: 12 },
                            padding: 15,
                            usePointStyle: true,
                          },
                        },
                        tooltip: {
                          enabled: true,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleFont: { size: 13 },
                          bodyFont: { size: 12 },
                          padding: 10,
                          callbacks: {
                            label: function(context: any) {
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                          }
                        },
                      },
                    }}
                  />
                </div>
              ) : null}
              
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
