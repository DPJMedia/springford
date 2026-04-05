"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";
import dynamic from "next/dynamic";
import { compareAdSlotsForTable, formatAdSlotDisplayName } from "@/lib/analytics/adSlotDisplay";

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

/** Geographic lists: top 5 visible; expand shows up to max (avoids rendering hundreds of rows) */
const GEO_LIST_COLLAPSED = 5;
const GEO_LIST_EXPANDED_MAX = 50;

/** Diffuse admin UI / Chart.js — Space Grotesk (see app/layout.tsx --font-space-grotesk) */
const CHART_FONT_FAMILY = '"Space Grotesk", system-ui, sans-serif';

const navItemActive = "bg-[var(--admin-accent)]/20 text-[var(--admin-accent)]";
const navItemInactive =
  "text-[var(--admin-text)] hover:bg-[var(--admin-card-bg)]";

/** Revenue potential: 6 advertisers × $150/mo each, scaled to last-30-day page views vs 10k baseline. */
const REVENUE_BASELINE_MONTHLY_VIEWS = 10_000;
const REVENUE_ADVERTISERS = 6;
const REVENUE_MONTHLY_PER_ADVERTISER_USD = 150;

type DashboardTimeRange = "7d" | "30d" | "90d" | "all";
/** Chart window: independent from dashboard metrics when changed from the chart control only. */
type ChartTimeRange = "24h" | "7d" | "30d" | "90d" | "all";

function chartRangeFromSidebar(tr: DashboardTimeRange): ChartTimeRange {
  switch (tr) {
    case "7d":
      return "7d";
    case "30d":
      return "30d";
    case "90d":
      return "90d";
    case "all":
      return "all";
  }
}

/** Y max: peak of visible series for the chart time range, rounded up to the next 500 views (min 500). */
function computeFitYAxisMaxFromSeries(
  series: { homepage: number; article: number }[],
  showHomepage: boolean,
  showArticle: boolean,
): number | null {
  const all: number[] = [];
  if (showHomepage) for (const p of series) all.push(p.homepage);
  if (showArticle) for (const p of series) all.push(p.article);
  if (all.length === 0) return null;
  const maxVal = Math.max(...all);
  return Math.max(500, Math.ceil(maxVal / 500) * 500);
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");
  
  // Executive metrics
  const [totalPageViews, setTotalPageViews] = useState(0);
  const [allTimePageViews, setAllTimePageViews] = useState(0);
  const [avgSessionDuration, setAvgSessionDuration] = useState(0);
  const [totalAdImpressions, setTotalAdImpressions] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [pageViewsLast30Days, setPageViewsLast30Days] = useState(0);
  
  // Content metrics
  const [topArticles, setTopArticles] = useState<any[]>([]);
  const [sectionPerformance, setSectionPerformance] = useState<any[]>([]);
  const [authorPerformance, setAuthorPerformance] = useState<any[]>([]);
  const [avgReadingTime, setAvgReadingTime] = useState(0);
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
  
  // Chart controls (defaults match sidebar so the chart uses the same window until overridden in-chart)
  const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>("30d");
  const [yAxisMax, setYAxisMax] = useState(1000);
  const [showHomepageViews, setShowHomepageViews] = useState(true);
  const [showArticleViews, setShowArticleViews] = useState(true);
  
  // View more controls
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllStates, setShowAllStates] = useState(false);
  
  const supabase = createClient();

  const isInitialAnalyticsLoad = useRef(true);
  const prevDashboardTimeRangeRef = useRef<DashboardTimeRange>(timeRange);

  useEffect(() => {
    const dashboardRangeChanged =
      isInitialAnalyticsLoad.current || prevDashboardTimeRangeRef.current !== timeRange;
    isInitialAnalyticsLoad.current = false;
    prevDashboardTimeRangeRef.current = timeRange;
    void loadDashboard(dashboardRangeChanged);
  }, [timeRange, chartTimeRange]);

  function applySidebarTimeRange(next: DashboardTimeRange) {
    setTimeRange(next);
    setChartTimeRange(chartRangeFromSidebar(next));
  }

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
        borderColor: "rgb(209, 213, 219)",
        backgroundColor: "rgba(209, 213, 219, 0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      });
    }
    if (showArticleViews) {
      datasets.push({
        label: "Article Views",
        data: chartSeriesRaw.map((p) => p.article),
        borderColor: "rgb(255, 150, 40)",
        backgroundColor: "rgba(255, 150, 40, 0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      });
    }
    setPageViewsOverTime({ labels, datasets });
  }, [chartSeriesRaw, serverChartGranularity, showHomepageViews, showArticleViews]);

  /** Y-axis fits the visible chart series for the selected chart time range */
  useEffect(() => {
    const next = computeFitYAxisMaxFromSeries(
      chartSeriesRaw,
      showHomepageViews,
      showArticleViews,
    );
    if (next != null) setYAxisMax(next);
  }, [chartSeriesRaw, showHomepageViews, showArticleViews, chartTimeRange]);

  async function loadDashboard(showFullPageLoading: boolean) {
    try {
      if (showFullPageLoading) setLoading(true);
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
      setAllTimePageViews(d.allTimePageViews ?? 0);
      setAvgSessionDuration(d.avgSessionSeconds ?? 0);
      setTotalAdImpressions(d.totalAdImpressions ?? 0);
      setPageViewsLast30Days(d.pageViewsLast30Days ?? 0);
      const pv = d.totalPageViews ?? 0;
      const clicks = d.adClicksInRange ?? 0;
      setEngagementRate(pv > 0 ? (clicks / pv) * 100 : 0);

      setPublishedArticleCount(d.publishedArticleCount ?? 0);
      setTopArticles(Array.isArray(d.topArticles) ? d.topArticles : []);
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
              backgroundColor: ["rgba(209, 213, 219, 0.8)", "rgba(255, 150, 40, 0.8)"],
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
                "rgba(255, 150, 40, 0.8)",
                "rgba(209, 213, 219, 0.8)",
                "rgba(156, 163, 175, 0.8)",
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
      if (showFullPageLoading) setLoading(false);
    }
  }

  const revenueEst = useMemo(
    () =>
      (pageViewsLast30Days / REVENUE_BASELINE_MONTHLY_VIEWS) *
      REVENUE_ADVERTISERS *
      REVENUE_MONTHLY_PER_ADVERTISER_USD,
    [pageViewsLast30Days],
  );

  const sortedAdSlotPerformance = useMemo(
    () =>
      [...adSlotPerformance].sort((a, b) =>
        compareAdSlotsForTable(String(a.slot), String(b.slot)),
      ),
    [adSlotPerformance],
  );

  const sortedCurrentAdsStats = useMemo(
    () =>
      [...currentAdsStats].sort((a, b) => {
        const bySlot = compareAdSlotsForTable(String(a.ad_slot), String(b.ad_slot));
        return bySlot !== 0 ? bySlot : String(a.name ?? "").localeCompare(String(b.name ?? ""));
      }),
    [currentAdsStats],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--admin-accent)] border-r-transparent"></div>
          <p className="mt-4 text-[var(--admin-text-muted)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const timeRangeLabels = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    'all': 'All Time'
  };

  const actionsPanel = (
    <AdminActionsPanel
      sections={[
        {
          title: "Time Period",
          customContent: (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => applySidebarTimeRange("7d")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                  timeRange === "7d" ? navItemActive : navItemInactive
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applySidebarTimeRange("30d")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                  timeRange === "30d" ? navItemActive : navItemInactive
                }`}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => applySidebarTimeRange("90d")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                  timeRange === "90d" ? navItemActive : navItemInactive
                }`}
              >
                Last 90 Days
              </button>
              <button
                type="button"
                onClick={() => applySidebarTimeRange("all")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                  timeRange === "all" ? navItemActive : navItemInactive
                }`}
              >
                All Time
              </button>
            </div>
          ),
        },
        {
          title: "Actions",
          items: [
            {
              icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              ),
              label: "Export Data",
              onClick: () => alert("Export functionality coming soon"),
            },
            {
              icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
              label: "Refresh Data",
              onClick: () => window.location.reload(),
            },
          ],
        },
      ]}
    />
  );

  return (
    <>
      <AdminPageHeader 
        title="Analytics"
      />

      <AdminPageLayout
        actionsColumnClassName="xl:pt-11"
        actionsPanel={actionsPanel}
      >

      {/* === CONTENT PERFORMANCE === */}
      <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Content Performance</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <CompactStatCard
              label="Published articles"
              value={publishedArticleCount.toLocaleString()}
              tooltip='Total number of articles with status "published" in article management (matches the CMS).'
            />
            <CompactStatCard
              label={`${timeRangeLabels[timeRange]} views`}
              value={totalPageViews.toLocaleString()}
              tooltip="Total page views within the selected time period. Each page load counts as one view, including multiple views from the same visitor."
            />
            <CompactStatCard
              label="All-time views"
              value={allTimePageViews.toLocaleString()}
              tooltip="Total number of pages viewed across your site since tracking began. Each page load counts as one view."
            />
            <CompactStatCard
              label="Avg session duration"
              value={`${Math.floor(avgSessionDuration / 60)}:${String(avgSessionDuration % 60).padStart(2, "0")}`}
              tooltip="Average time per session (sum of time-on-page with scroll activity ÷ unique sessions). Development / localhost geolocation and localhost referrers are excluded so local testing does not inflate this number."
            />
            <CompactStatCard
              label="Engagement rate"
              value={`${engagementRate.toFixed(2)}%`}
              tooltip="Percentage of page views that result in ad clicks. Higher rates indicate more engaged readers and better ad placement."
            />
            <CompactStatCard
              label="Revenue potential"
              value={`$${revenueEst.toFixed(2)}`}
              tooltip={`Estimated monthly revenue from last 30 days of page views: ${REVENUE_ADVERTISERS} advertisers × $${REVENUE_MONTHLY_PER_ADVERTISER_USD}/mo at ${REVENUE_BASELINE_MONTHLY_VIEWS.toLocaleString()} views (${(REVENUE_ADVERTISERS * REVENUE_MONTHLY_PER_ADVERTISER_USD).toLocaleString()} total at baseline). Scales linearly with views. Not actual billings.`}
            />
          </div>

          {/* Top Articles Table */}
          <h3 className="text-lg font-semibold text-white mb-3">Top Articles</h3>
          <div className="bg-[var(--admin-card-bg)] rounded-lg overflow-hidden mb-6 border border-[var(--admin-border)]">
            {topArticles.length === 0 ? (
              <div className="p-8 text-center text-[var(--admin-text-muted)]">No article data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--admin-table-header-bg)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Views</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Avg Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Shares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {topArticles.slice(0, 5).map((article, i) => (
                      <tr key={article.id} className="hover:bg-[var(--admin-table-row-hover)]">
                        <td className="px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">#{i + 1}</td>
                        <td className="px-4 py-3 text-sm text-[var(--admin-text)] max-w-md">
                          <Link href={`/article/${article.slug}`} target="_blank" className="hover:text-[var(--admin-accent)] hover:underline">
                            {article.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">
                          {article.view_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--admin-text)]">
                          {article.avgTimeSpent > 0 ? `${Math.floor(article.avgTimeSpent / 60)}:${String(article.avgTimeSpent % 60).padStart(2, '0')}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-3">Top Sections</h3>
              <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
              {sectionPerformance.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">No section data yet</p>
              ) : (
                <div className="space-y-3">
                  {sectionPerformance.map((section) => (
                    <div key={section.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--admin-text)] capitalize">{section.name}</span>
                      <div className="text-sm font-semibold text-[var(--admin-text)]">
                        {Number(section.views ?? 0).toLocaleString()} views
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-3">Top Authors</h3>
              <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6">
              {authorPerformance.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">No author click data yet</p>
              ) : (
                <div className="space-y-3">
                  {authorPerformance.map((author) => (
                    <div key={author.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--admin-text)]">{author.name}</span>
                      <span className="text-sm font-semibold text-[var(--admin-text)]">{author.clicks} clicks</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
      </div>

      {/* === AD PERFORMANCE === */}
      <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white min-w-0">Advertisement Performance</h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAdStatsView("all-time")}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                  adStatsView === "all-time"
                    ? "bg-[var(--admin-accent)] text-black"
                    : "bg-[var(--admin-card-bg)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)] border border-[var(--admin-border)]"
                }`}
              >
                All-Time by Slot
              </button>
              <button
                type="button"
                onClick={() => setAdStatsView("current")}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                  adStatsView === "current"
                    ? "bg-[var(--admin-accent)] text-black"
                    : "bg-[var(--admin-card-bg)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)] border border-[var(--admin-border)]"
                }`}
              >
                Current Ads
              </button>
            </div>
          </div>

          <div className="bg-[var(--admin-card-bg)] rounded-lg overflow-hidden border border-[var(--admin-border)]">
            {adStatsView === 'all-time' ? (
              <>
                {adSlotPerformance.length === 0 ? (
                  <div className="p-8 text-center text-[var(--admin-text-muted)]">No ad impression data yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--admin-table-header-bg)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Slot</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Impressions</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Clicks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">CTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--admin-border)]">
                        {sortedAdSlotPerformance.map((slot) => (
                          <tr key={slot.slot} className="hover:bg-[var(--admin-table-row-hover)]">
                            <td className="px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
                              {formatAdSlotDisplayName(String(slot.slot))}
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--admin-text)]">{slot.impressions}</td>
                            <td className="px-4 py-3 text-sm text-[var(--admin-text)]">{slot.clicks}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">{slot.ctr}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                {currentAdsStats.length === 0 ? (
                  <div className="p-8 text-center text-[var(--admin-text-muted)]">No active ads right now</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--admin-table-header-bg)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Ad Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Ad Slot</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Impressions</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">Clicks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-text)] uppercase">CTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--admin-border)]">
                        {sortedCurrentAdsStats.map((row, idx) => (
                          <tr key={`${row.ad_slot}-${row.name}-${idx}`} className="hover:bg-[var(--admin-table-row-hover)]">
                            <td className="px-4 py-3 text-sm font-medium text-[var(--admin-text)]">{row.name}</td>
                            <td className="px-4 py-3 text-sm text-[var(--admin-text)]">
                              {formatAdSlotDisplayName(String(row.ad_slot))}
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--admin-text)]">{row.impressions}</td>
                            <td className="px-4 py-3 text-sm text-[var(--admin-text)]">{row.clicks}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">{row.ctr}%</td>
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="min-w-0 text-xl font-semibold text-white">Page Views Chart</h2>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              <label className="sr-only" htmlFor="chart-time-range">
                Chart time period
              </label>
              <select
                id="chart-time-range"
                value={chartTimeRange}
                onChange={(e) => setChartTimeRange(e.target.value as ChartTimeRange)}
                className="min-w-0 max-w-full cursor-pointer rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-card-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/40 [font-family:inherit] [color-scheme:dark]"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
              <button
                type="button"
                aria-pressed={showHomepageViews}
                onClick={() => setShowHomepageViews((v) => !v)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  showHomepageViews
                    ? "bg-[var(--admin-accent)] text-black hover:opacity-90"
                    : "border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                }`}
              >
                Homepage views
              </button>
              <button
                type="button"
                aria-pressed={showArticleViews}
                onClick={() => setShowArticleViews((v) => !v)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  showArticleViews
                    ? "bg-[var(--admin-accent)] text-black hover:opacity-90"
                    : "border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                }`}
              >
                Article views
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)]">
            <div className="p-4 sm:p-6">
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
                        titleFont: { family: CHART_FONT_FAMILY, size: 14, weight: 'bold' },
                        bodyFont: { family: CHART_FONT_FAMILY, size: 13 },
                        padding: 12,
                        displayColors: false,
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
                          font: { family: CHART_FONT_FAMILY, size: 12 },
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
                          font: { family: CHART_FONT_FAMILY, size: 12 },
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
              <div className="h-96 flex items-center justify-center text-[var(--admin-text-muted)]">
                <p>Please select at least one view type to display the chart</p>
              </div>
            )}
            </div>
          </div>
      </div>

      {/* === LOCATION INSIGHTS === */}
      <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Geographic Insights</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Cities */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Top Cities</h3>
              <div className="bg-[var(--admin-card-bg)] rounded-lg p-6 border border-[var(--admin-border)]">
              {topCities.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">No city data available yet</p>
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
                            <span className="font-medium text-[var(--admin-text)]">
                              #{index + 1} {city.city}
                            </span>
                            <span className="text-[var(--admin-text)] font-semibold">{city.count} {visitorLabel} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-[var(--admin-content-bg)] rounded-full h-2">
                            <div 
                              className="bg-[var(--admin-accent)] h-2 rounded-full transition-all"
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
                        className="mt-4 w-full px-4 py-2 text-sm font-medium text-[var(--admin-accent)] hover:opacity-80 hover:bg-[var(--admin-content-bg)] rounded-md transition border border-[var(--admin-border)]"
                      >
                        {showAllCities ? "Show less" : "View more"}
                      </button>
                      {showAllCities && topCities.length > GEO_LIST_EXPANDED_MAX && (
                        <p className="mt-2 text-center text-xs text-[var(--admin-text-muted)]">
                          Showing top {GEO_LIST_EXPANDED_MAX} of {topCities.length.toLocaleString()} cities.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
              </div>
            </div>

            {/* Top States */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Top States/Regions</h3>
              <div className="bg-[var(--admin-card-bg)] rounded-lg p-6 border border-[var(--admin-border)]">
              {topStates.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">No state data available yet</p>
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
                            <span className="font-medium text-[var(--admin-text)]">
                              #{index + 1} {state.state}
                            </span>
                            <span className="text-[var(--admin-text)] font-semibold">{state.count} {visitorLabel} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-[var(--admin-content-bg)] rounded-full h-2">
                            <div 
                              className="bg-[var(--admin-accent)] h-2 rounded-full transition-all"
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
                        className="mt-4 w-full px-4 py-2 text-sm font-medium text-[var(--admin-accent)] hover:opacity-80 hover:bg-[var(--admin-content-bg)] rounded-md transition border border-[var(--admin-border)]"
                      >
                        {showAllStates ? "Show less" : "View more"}
                      </button>
                      {showAllStates && topStates.length > GEO_LIST_EXPANDED_MAX && (
                        <p className="mt-2 text-center text-xs text-[var(--admin-text-muted)]">
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
      </div>

      {/* === TRAFFIC QUALITY === */}
      <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Traffic Quality</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  Traffic Sources
                </h3>
              </div>
              <div className="bg-[var(--admin-card-bg)] rounded-lg p-6 border border-[var(--admin-border)]">
              
              {trafficChartData ? (
                <div className="h-80 flex items-center justify-center mb-4">
                  <Doughnut 
                    data={trafficChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          display: false,
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

              {trafficChartData?.labels?.length ? (
                <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                    {trafficChartData.labels.map((label: string, idx: number) => {
                      const colors = trafficChartData.datasets?.[0]?.backgroundColor ?? [];
                      const color = colors[idx] || "rgba(255, 150, 40, 0.8)";
                      return (
                        <span
                          key={label}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] px-3 py-1 text-xs font-medium text-[var(--admin-text)]"
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </span>
                      );
                    })}
                </div>
              ) : null}
              
              {trafficSources.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">No traffic data yet</p>
              ) : (
                <div className="space-y-3">
                  {trafficSources.map((source) => {
                    const total = trafficSources.reduce((sum, s) => sum + s.count, 0);
                    const percentage = ((source.count / total) * 100).toFixed(1);
                    // Display names
                    const displayNames: Record<string, string> = {
                      'search': 'Search Engines',
                      'external': 'External Sources'
                    };
                    
                    return (
                      <div key={source.source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[var(--admin-text)] flex items-center">
                            {displayNames[source.source] || source.source}
                          </span>
                          <span className="text-[var(--admin-text)] font-semibold">{source.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-[var(--admin-content-bg)] rounded-full h-2">
                          <div 
                            className="bg-[var(--admin-accent)] h-2 rounded-full transition-all"
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

            {/* Device Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  Device Distribution
                </h3>
              </div>
              <div className="bg-[var(--admin-card-bg)] rounded-lg p-6 border border-[var(--admin-border)]">
              
              {deviceChartData ? (
                <div className="h-80 flex items-center justify-center mb-4">
                  <Doughnut 
                    data={deviceChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          display: false,
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

              {deviceChartData?.labels?.length ? (
                <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                    {deviceChartData.labels.map((label: string, idx: number) => {
                      const colors = deviceChartData.datasets?.[0]?.backgroundColor ?? [];
                      const color = colors[idx] || "rgba(255, 150, 40, 0.8)";
                      return (
                        <span
                          key={label}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] px-3 py-1 text-xs font-medium text-[var(--admin-text)]"
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </span>
                      );
                    })}
                </div>
              ) : null}
              
              {deviceBreakdown.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">No device data yet</p>
              ) : (
                <div className="space-y-3">
                  {deviceBreakdown.map((device) => {
                    const total = deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
                    const percentage = ((device.count / total) * 100).toFixed(1);
                    
                    return (
                      <div key={device.device}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[var(--admin-text)] capitalize flex items-center">
                            {device.device}
                          </span>
                          <span className="text-[var(--admin-text)] font-semibold">{device.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-[var(--admin-content-bg)] rounded-full h-2">
                          <div 
                            className="bg-[var(--admin-accent)] h-2 rounded-full transition-all"
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
      </AdminPageLayout>
    </>
  );
}


function CompactStatCard({
  label,
  value,
  subtitle,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  tooltip?: string;
}) {
  return (
    <div className="group relative min-w-0 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] px-3 py-3 sm:px-4 sm:py-3.5 hover:border-[var(--admin-accent)]/50 transition-all">
      <div className="text-base sm:text-lg font-semibold tabular-nums text-[var(--admin-accent)] leading-tight truncate">
        {value}
      </div>
      <div className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)] leading-snug">
        {label}
      </div>
      {subtitle ? (
        <div className="mt-0.5 text-[10px] text-[var(--admin-text-muted)]/90 truncate">{subtitle}</div>
      ) : null}
      {tooltip ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-2 hidden w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 group-hover:block">
          <div className="relative rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-3 text-left text-sm leading-snug text-[var(--admin-text)] shadow-lg">
            <div
              className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[8px] border-x-transparent border-b-[var(--admin-card-bg)]"
              aria-hidden
            />
            {tooltip}
          </div>
        </div>
      ) : null}
    </div>
  );
}
