"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import Chart components with no SSR
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});
const Doughnut = dynamic(() => import("react-chartjs-2").then((mod) => mod.Doughnut), {
  ssr: false,
});

// Register Chart.js components on client side only
if (typeof window !== 'undefined') {
  import("chart.js").then((ChartJS) => {
    ChartJS.Chart.register(
      ChartJS.CategoryScale,
      ChartJS.LinearScale,
      ChartJS.PointElement,
      ChartJS.LineElement,
      ChartJS.BarElement,
      ChartJS.ArcElement,
      ChartJS.Title,
      ChartJS.Tooltip,
      ChartJS.Legend,
      ChartJS.Filler
    );
  });
  
  import("chartjs-plugin-zoom").then((zoomPlugin) => {
    import("chart.js").then((ChartJS) => {
      ChartJS.Chart.register(zoomPlugin.default);
    });
  });
}

/** Y-axis max options — zoom out extends further so high-traffic days stay visible */
const Y_AXIS_MAX_STEPS = [
  10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000,
] as const;

/** Geographic lists: 10 collapsed, max 50 when expanded (avoids rendering hundreds of rows) */
const GEO_LIST_COLLAPSED = 10;
const GEO_LIST_EXPANDED_MAX = 50;

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
  const [publishedArticleCount, setPublishedArticleCount] = useState(0);

  // Ad metrics
  const [adSlotPerformance, setAdSlotPerformance] = useState<any[]>([]); // All-time by slot
  const [currentAdsStats, setCurrentAdsStats] = useState<any[]>([]); // Current active ads, stats since published
  const [adStatsView, setAdStatsView] = useState<'all-time' | 'current'>('all-time'); // which table to show
  const [topAds, setTopAds] = useState<any[]>([]);
  
  // Traffic metrics
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  
  // Location metrics
  const [topCities, setTopCities] = useState<any[]>([]);
  const [topStates, setTopStates] = useState<any[]>([]);
  
  // Chart data (chartSeriesRaw from API; pageViewsOverTime derived for Chart.js)
  const [chartSeriesRaw, setChartSeriesRaw] = useState<
    { bucketKey: string; homepage: number; article: number }[]
  >([]);
  const [serverChartGranularity, setServerChartGranularity] = useState<"hour" | "day">("day");
  const [pageViewsOverTime, setPageViewsOverTime] = useState<any>(null);
  const [trafficChartData, setTrafficChartData] = useState<any>(null);
  const [deviceChartData, setDeviceChartData] = useState<any>(null);
  
  // Chart controls
  const [chartTimeRange, setChartTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [yAxisMax, setYAxisMax] = useState(1000);
  const [showHomepageViews, setShowHomepageViews] = useState(true);
  const [showArticleViews, setShowArticleViews] = useState(true);
  const [showTrafficChart, setShowTrafficChart] = useState(false);
  const [showDeviceChart, setShowDeviceChart] = useState(false);
  
  // View more controls
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllStates, setShowAllStates] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      void loadDashboard();
    }
  }, [user, timeRange, chartTimeRange]);

  /** Rebuild Chart.js config when toggles or series change (no extra network). */
  useEffect(() => {
    if (!chartSeriesRaw.length) {
      setPageViewsOverTime(null);
      return;
    }
    const labels = chartSeriesRaw.map((p) => {
      if (serverChartGranularity === "hour") {
        const date = new Date(`${p.bucketKey}:00:00Z`);
        return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
      }
      return new Date(`${p.bucketKey}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    });
    const datasets: unknown[] = [];
    if (showHomepageViews) {
      datasets.push({
        label: "Homepage Views",
        data: chartSeriesRaw.map((p) => p.homepage),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      });
    }
    if (showArticleViews) {
      datasets.push({
        label: "Article Views",
        data: chartSeriesRaw.map((p) => p.article),
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      });
    }
    setPageViewsOverTime({ labels, datasets });
  }, [chartSeriesRaw, serverChartGranularity, showHomepageViews, showArticleViews]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/analytics-dashboard?timeRange=${encodeURIComponent(timeRange)}&chartTimeRange=${encodeURIComponent(chartTimeRange)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Analytics API error:", err);
        return;
      }
      const d = await res.json();

      setTotalPageViews(d.totalPageViews ?? 0);
      setAvgSessionDuration(d.avgSessionSeconds ?? 0);
      setTotalAdImpressions(d.totalAdImpressions ?? 0);
      const impressions = d.totalAdImpressions ?? 0;
      setRevenueEst((impressions / 1000) * 5);
      const pv = d.totalPageViews ?? 0;
      const clicks = d.adClicksInRange ?? 0;
      setEngagementRate(pv > 0 ? (clicks / pv) * 100 : 0);

      setPublishedArticleCount(d.publishedArticleCount ?? 0);
      setTopArticles(Array.isArray(d.topArticles) ? d.topArticles : []);
      setCompletionRate(Number(d.completionRatePercent) || 0);
      setAvgReadingTime(d.avgReadingTimeSeconds ?? 0);

      setSectionPerformance(Array.isArray(d.sectionPerformance) ? d.sectionPerformance : []);
      setAuthorPerformance(Array.isArray(d.authorPerformance) ? d.authorPerformance : []);
      setAdSlotPerformance(Array.isArray(d.adSlotPerformance) ? d.adSlotPerformance : []);
      setCurrentAdsStats(Array.isArray(d.currentAdsStats) ? d.currentAdsStats : []);
      setTopAds(Array.isArray(d.topAds) ? d.topAds : []);

      const traffic = Array.isArray(d.trafficSources) ? d.trafficSources : [];
      setTrafficSources(traffic);
      if (traffic.length > 0) {
        const displayNames: Record<string, string> = {
          search: "Search Engines",
          external: "External Sources",
        };
        setTrafficChartData({
          labels: traffic.map((s: { source: string }) => displayNames[s.source] || s.source),
          datasets: [
            {
              data: traffic.map((s: { count: number }) => s.count),
              backgroundColor: ["rgba(59, 130, 246, 0.8)", "rgba(16, 185, 129, 0.8)"],
            },
          ],
        });
      }

      const devices = Array.isArray(d.deviceBreakdown) ? d.deviceBreakdown : [];
      setDeviceBreakdown(devices);
      if (devices.length > 0) {
        setDeviceChartData({
          labels: devices.map((x: { device: string }) =>
            x.device.charAt(0).toUpperCase() + x.device.slice(1),
          ),
          datasets: [
            {
              data: devices.map((x: { count: number }) => x.count),
              backgroundColor: [
                "rgba(16, 185, 129, 0.8)",
                "rgba(59, 130, 246, 0.8)",
                "rgba(245, 158, 11, 0.8)",
              ],
            },
          ],
        });
      }

      setTopCities(Array.isArray(d.topCities) ? d.topCities : []);
      setTopStates(Array.isArray(d.topStates) ? d.topStates : []);

      const chart = d.chart;
      const series = Array.isArray(chart) ? chart : [];
      setChartSeriesRaw(series);
      setServerChartGranularity(d.chartGranularity === "hour" ? "hour" : "day");
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  function zoomIn() {
    setYAxisMax((prev) => {
      const idx = Y_AXIS_MAX_STEPS.findIndex((x) => x === prev);
      if (idx > 0) return Y_AXIS_MAX_STEPS[idx - 1];
      const smaller = [...Y_AXIS_MAX_STEPS].filter((x) => x < prev).pop();
      return smaller ?? Y_AXIS_MAX_STEPS[0];
    });
  }

  function zoomOut() {
    setYAxisMax((prev) => {
      const idx = Y_AXIS_MAX_STEPS.findIndex((x) => x === prev);
      if (idx >= 0 && idx < Y_AXIS_MAX_STEPS.length - 1) return Y_AXIS_MAX_STEPS[idx + 1];
      const larger = Y_AXIS_MAX_STEPS.find((x) => x > prev);
      return larger ?? Y_AXIS_MAX_STEPS[Y_AXIS_MAX_STEPS.length - 1];
    });
  }

  /** Set Y max so the tallest series fits (~10% headroom) */
  function fitYAxisToData() {
    if (!pageViewsOverTime?.datasets?.length) return;
    const all: number[] = [];
    for (const ds of pageViewsOverTime.datasets as { data?: number[] }[]) {
      for (const n of ds.data ?? []) {
        if (typeof n === "number") all.push(n);
      }
    }
    if (all.length === 0) return;
    const maxVal = Math.max(...all);
    const target = Math.max(10, Math.ceil(maxVal * 1.1));
    const next =
      Y_AXIS_MAX_STEPS.find((x) => x >= target) ?? Y_AXIS_MAX_STEPS[Y_AXIS_MAX_STEPS.length - 1];
    setYAxisMax(next);
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
              tooltip="Total number of pages viewed across your site. Each page load counts as one view, including multiple views from the same visitor."
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
              tooltip="Average time per session (sum of time-on-page with scroll activity ÷ unique sessions). Development / localhost geolocation and localhost referrers are excluded so local testing does not inflate this number."
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
              tooltip="Estimated ad revenue based on $5 CPM (cost per 1,000 impressions). Actual revenue depends on your ad network and rates."
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
              tooltip="Percentage of page views that result in ad clicks. Higher rates indicate more engaged readers and better ad placement."
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
              <div className="text-sm font-semibold text-gray-600 flex items-center">
                Avg Reading Time
                <InfoTooltip text="Average time readers spend on articles, tracked from when they start reading until they navigate away. Calculated from article_scroll_data." />
              </div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-green-500">
              <div className="text-2xl font-black text-green-600 mb-1">
                {completionRate.toFixed(1)}%
              </div>
              <div className="text-sm font-semibold text-gray-600 flex items-center">
                Article Completion Rate
                <InfoTooltip text="Percentage of readers who scroll to at least 90% of an article. Higher rates indicate engaging content that readers finish." />
              </div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-purple-500">
              <div className="text-2xl font-black text-purple-600 mb-1">
                {publishedArticleCount.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-gray-600 flex items-center">
                Published Articles
                <InfoTooltip text="Total number of articles with status “published” in article management (matches the CMS)." />
              </div>
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

          {/* Ad quick stat: revenue only */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-green-500 max-w-xs">
              <div className="text-2xl font-black text-green-600 mb-1">
                ${revenueEst.toFixed(2)}
              </div>
              <div className="text-sm font-semibold text-gray-600 flex items-center">
                Est. Revenue (CPM $5)
                <InfoTooltip text="Estimated advertising revenue calculated at $5 per 1,000 impressions (CPM). Actual rates vary by ad network and demand." />
              </div>
              <div className="text-xs text-gray-500 mt-1">Based on impressions (selected time range)</div>
            </div>
          </div>

          {/* Performance by ad slot: toggle between All-Time and Current Ad Stats */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setAdStatsView('all-time')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                adStatsView === 'all-time'
                  ? 'bg-[color:var(--color-riviera-blue)] text-white'
                  : 'bg-gray-100 text-[color:var(--color-dark)] hover:bg-gray-200'
              }`}
            >
              All-Time Performance by Ad Slot
            </button>
            <button
              type="button"
              onClick={() => setAdStatsView('current')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                adStatsView === 'current'
                  ? 'bg-[color:var(--color-riviera-blue)] text-white'
                  : 'bg-gray-100 text-[color:var(--color-dark)] hover:bg-gray-200'
              }`}
            >
              Current Ad Stats
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {adStatsView === 'all-time' ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-bold text-[color:var(--color-dark)]">All-Time Performance by Ad Slot</h3>
                  <p className="text-xs text-gray-500 mt-1">Cumulative impressions and clicks per slot (no reset).</p>
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {adSlotPerformance.map((slot) => (
                          <tr key={slot.slot} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{slot.slot}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{slot.impressions}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{slot.clicks}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">{slot.ctr}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-bold text-[color:var(--color-dark)]">Current Ad Stats</h3>
                  <p className="text-xs text-gray-500 mt-1">Active ads on the site and their performance since being published.</p>
                </div>
                {currentAdsStats.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No active ads right now</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Slot</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impressions</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentAdsStats.map((row, idx) => (
                          <tr key={`${row.ad_slot}-${row.name}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.ad_slot}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.impressions}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.clicks}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">{row.ctr}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
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
                  type="button"
                  onClick={zoomOut}
                  disabled={yAxisMax >= Y_AXIS_MAX_STEPS[Y_AXIS_MAX_STEPS.length - 1]}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium rounded-md transition"
                >
                  Zoom Out
                </button>
                <span className="text-sm font-semibold text-gray-700 min-w-[100px] text-center">
                  0 – {yAxisMax.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={yAxisMax <= Y_AXIS_MAX_STEPS[0]}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium rounded-md transition"
                >
                  Zoom In
                </button>
                <button
                  type="button"
                  onClick={fitYAxisToData}
                  className="px-3 py-1.5 bg-[color:var(--color-riviera-blue)] text-white hover:opacity-90 text-sm font-medium rounded-md transition"
                  title="Set vertical scale to fit the highest point in the chart"
                >
                  Fit to data
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
                          maxTicksLimit: 12,
                          callback: function(value: any) {
                            return value.toLocaleString();
                          },
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] flex items-center">
                  Top Cities
                  <span className="text-xs font-normal text-gray-500 ml-2">(Unique Visitors)</span>
                  <InfoTooltip text="Cities where your visitors are located, based on IP geolocation. Each unique session ID is counted once per city." />
                </h3>
              </div>
              {topCities.length === 0 ? (
                <p className="text-sm text-gray-500">No city data available yet</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {(showAllCities
                      ? topCities.slice(0, Math.min(GEO_LIST_EXPANDED_MAX, topCities.length))
                      : topCities.slice(0, GEO_LIST_COLLAPSED)
                    ).map((city, index) => {
                      const total = topCities.reduce((sum, c) => sum + c.count, 0);
                      const percentage = ((city.count / total) * 100).toFixed(1);
                      const visitorLabel = city.count === 1 ? 'visitor' : 'visitors';
                      return (
                        <div key={city.city}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">
                              #{index + 1} {city.city}
                            </span>
                            <span className="text-gray-900 font-semibold">{city.count} {visitorLabel} ({percentage}%)</span>
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
                  {topCities.length > GEO_LIST_COLLAPSED && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAllCities(!showAllCities)}
                        className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition border border-blue-200"
                      >
                        {showAllCities
                          ? "Show less"
                          : `View more (${Math.min(GEO_LIST_EXPANDED_MAX, topCities.length) - GEO_LIST_COLLAPSED} more cities)`}
                      </button>
                      {showAllCities && topCities.length > GEO_LIST_EXPANDED_MAX && (
                        <p className="mt-2 text-center text-xs text-gray-500">
                          Showing top {GEO_LIST_EXPANDED_MAX} of {topCities.length.toLocaleString()} cities.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Top States */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] flex items-center">
                  Top States/Regions
                  <span className="text-xs font-normal text-gray-500 ml-2">(Unique Visitors)</span>
                  <InfoTooltip text="States/regions where your visitors are located, based on IP geolocation. Each unique session ID is counted once per state." />
                </h3>
              </div>
              {topStates.length === 0 ? (
                <p className="text-sm text-gray-500">No state data available yet</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {(showAllStates
                      ? topStates.slice(0, Math.min(GEO_LIST_EXPANDED_MAX, topStates.length))
                      : topStates.slice(0, GEO_LIST_COLLAPSED)
                    ).map((state, index) => {
                      const total = topStates.reduce((sum, s) => sum + s.count, 0);
                      const percentage = ((state.count / total) * 100).toFixed(1);
                      const visitorLabel = state.count === 1 ? 'visitor' : 'visitors';
                      return (
                        <div key={state.state}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">
                              #{index + 1} {state.state}
                            </span>
                            <span className="text-gray-900 font-semibold">{state.count} {visitorLabel} ({percentage}%)</span>
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
                  {topStates.length > GEO_LIST_COLLAPSED && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAllStates(!showAllStates)}
                        className="mt-4 w-full px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition border border-green-200"
                      >
                        {showAllStates
                          ? "Show less"
                          : `View more (${Math.min(GEO_LIST_EXPANDED_MAX, topStates.length) - GEO_LIST_COLLAPSED} more states)`}
                      </button>
                      {showAllStates && topStates.length > GEO_LIST_EXPANDED_MAX && (
                        <p className="mt-2 text-center text-xs text-gray-500">
                          Showing top {GEO_LIST_EXPANDED_MAX} of {topStates.length.toLocaleString()} states/regions.
                        </p>
                      )}
                    </>
                  )}
                </>
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
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] flex items-center">
                  Traffic Sources
                  <InfoTooltip text="Where visitors came from before landing on your site: Search Engines (Google, Bing, etc.) or External Sources (social media, other websites, direct visits, etc.)." />
                </h3>
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
                    
                    // Simplified tooltip text
                    const sourceTooltips: Record<string, string> = {
                      'search': 'Visitors who found your site through search engines (Google, Bing, Yahoo, DuckDuckGo, etc.). These are people actively searching for news or topics.',
                      'external': 'Visitors from all other sources: social media (Facebook, Twitter), other websites linking to you, shared links, direct visits (typing URL or bookmarks), email links, etc.'
                    };
                    
                    // Display names
                    const displayNames: Record<string, string> = {
                      'search': 'Search Engines',
                      'external': 'External Sources'
                    };
                    
                    return (
                      <div key={source.source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 flex items-center">
                            {displayNames[source.source] || source.source}
                            <InfoTooltip text={sourceTooltips[source.source] || 'Traffic from this source.'} />
                          </span>
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
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] flex items-center">
                  Device Distribution
                  <InfoTooltip text="Types of devices visitors use to access your site. Detected from the browser's user agent string." />
                </h3>
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
                    
                    // Get tooltip text for each device type
                    const deviceTooltips: Record<string, string> = {
                      'desktop': 'Desktop and laptop computers. Includes Windows, Mac, Linux, and Chromebook users.',
                      'mobile': 'Smartphones. Includes iPhone, Android phones, and other mobile devices. Detected by screen size and user agent.',
                      'tablet': 'Tablets like iPad, Android tablets, Surface, and Kindle. Larger than phones but not full desktop screens.'
                    };
                    
                    return (
                      <div key={device.device}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 capitalize flex items-center">
                            {device.device}
                            <InfoTooltip text={deviceTooltips[device.device] || 'Traffic from this device type.'} />
                          </span>
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

// Info Tooltip Component
function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-2">
      <svg 
        className="w-5 h-5 text-blue-500 hover:text-blue-700 cursor-help inline-block transition-colors" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
          clipRule="evenodd" 
        />
      </svg>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl z-[9999] pointer-events-none">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-[6px] border-transparent border-t-gray-900"></div>
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
  color,
  tooltip
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
  tooltip?: string;
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
      <div className="text-sm font-semibold text-gray-600 mb-1 flex items-center">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  );
}
