"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsletterForm } from "@/components/NewsletterForm";
import { AdDisplay } from "@/components/AdDisplay";
import type { Article } from "@/lib/types/database";
import Link from "next/link";
import { usePageTracking } from "@/lib/analytics/usePageTracking";

// Ad slot wrapper component
function AdSlot({ 
  slot, 
  className = ""
}: { 
  slot: string; 
  className?: string;
}) {
  return (
    <div className="relative">
      <AdDisplay adSlot={slot} className={className} />
    </div>
  );
}

// Truncate excerpt to ~2 lines with ellipsis (consistent across all article cards)
function truncateExcerpt(text: string | null, maxLength = 140): string {
  if (!text || typeof text !== "string") return "";
  const stripped = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (stripped.length <= maxLength) return stripped;
  const truncated = stripped.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutAt = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
  return truncated.slice(0, cutAt).trim() + "...";
}

// Article Card Component
function ArticleCard({ article, size = "default" }: { article: Article; size?: "hero" | "featured" | "default" | "compact" }) {
  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  if (size === "hero") {
    return (
      <Link href={`/article/${article.slug}`} className="block group">
        <div className="relative h-[500px] overflow-hidden rounded-lg">
          {article.image_url ? (
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {article.is_advertisement && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur text-white/90 text-[10px] font-medium uppercase tracking-wider">
                <svg className="w-3 h-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                Advertisement
              </span>
            )}
            {article.is_breaking && (
              <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">
                BREAKING NEWS
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
            <h1 className="text-2xl font-black leading-tight mb-2 sm:mb-3 sm:text-3xl md:text-4xl group-hover:text-blue-400 transition">
              {article.title}
            </h1>
            {article.subtitle && (
              <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-2 sm:mb-3">{article.subtitle}</p>
            )}
            {article.excerpt && (
              <p className="text-sm sm:text-base text-gray-300">{truncateExcerpt(article.excerpt, 120)}</p>
            )}
            <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">
              {article.author_name} • {formattedDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (size === "featured") {
    return (
      <Link href={`/article/${article.slug}`} className="block group h-full min-w-0">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition h-full flex flex-col min-w-0">
          {article.image_url ? (
            <div className="relative h-48 overflow-hidden flex-shrink-0">
              {article.is_advertisement && (
                <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800/70 text-white/90 text-[10px] font-medium uppercase tracking-wider">
                  Advertisement
                </span>
              )}
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="relative h-48 overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 via-blue-50 to-gray-100 flex items-center justify-center">
              <svg className="w-20 h-20 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
          )}
          <div className="p-5 flex-1 flex flex-col min-w-0">
            <h3 className="font-bold text-xl text-[color:var(--color-dark)] mb-2 group-hover:text-blue-600 transition line-clamp-3 h-[5rem]">
              {article.title}
            </h3>
            {article.excerpt && (
              <p className="text-sm text-[color:var(--color-medium)] mb-3 flex-1">
                {truncateExcerpt(article.excerpt)}
              </p>
            )}
            <div className="text-xs text-[color:var(--color-medium)] mt-auto">
              {article.author_name} • {formattedDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (size === "compact") {
    return (
      <Link href={`/article/${article.slug}`} className="block group py-3 border-b border-gray-200 last:border-0 relative">
        <div className="flex gap-3">
          {article.image_url && (
            <div className="flex-shrink-0 w-20 h-20 overflow-hidden rounded">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {article.is_advertisement && (
                <span className="text-[9px] font-medium uppercase tracking-wider text-gray-500">Ad</span>
              )}
              <h4 className="text-sm font-bold text-[color:var(--color-dark)] group-hover:text-blue-600 transition line-clamp-2 flex-1 min-w-0">
                {article.title}
              </h4>
            </div>
            <div className="text-xs text-[color:var(--color-medium)]">
              {formattedDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/article/${article.slug}`} className="block group">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition h-full flex flex-col">
        {article.image_url ? (
          <div className="relative h-40 overflow-hidden flex-shrink-0">
            {article.is_advertisement && (
              <span className="absolute top-2 left-2 z-10 inline-flex items-center px-2 py-0.5 rounded bg-gray-800/70 text-white/90 text-[10px] font-medium uppercase tracking-wider">
                Advertisement
              </span>
            )}
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="relative h-40 overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 via-blue-50 to-gray-100 flex items-center justify-center">
            {article.is_advertisement && (
              <span className="absolute top-2 left-2 z-10 inline-flex items-center px-2 py-0.5 rounded bg-gray-600/80 text-white/90 text-[10px] font-medium uppercase tracking-wider">
                Advertisement
              </span>
            )}
            <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}
        <div className="p-4 flex-1 flex flex-col min-w-0">
          <h3 className="font-bold text-base text-[color:var(--color-dark)] mb-2 group-hover:text-blue-600 transition line-clamp-2">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-sm text-[color:var(--color-medium)] mb-2 flex-1">
              {truncateExcerpt(article.excerpt)}
            </p>
          )}
          <div className="text-xs text-[color:var(--color-medium)] mt-auto">
            {article.author_name} • {formattedDate}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Section Component
function NewsSection({ 
  title, 
  articles, 
  sectionName 
}: { 
  title: string; 
  articles: Article[]; 
  sectionName: string;
}) {
  return (
    <section id={sectionName.toLowerCase()} className="mb-8 scroll-mt-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black text-[color:var(--color-dark)] pb-2 border-b-4 border-[color:var(--color-riviera-blue)]">
          {title}
        </h2>
        {articles.length > 4 && (
          <Link 
            href={`/section/${sectionName.toLowerCase()}`}
            className="text-sm font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
          >
            View All →
          </Link>
        )}
      </div>
      {articles.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
          <p className="text-[color:var(--color-medium)]">No articles in this section yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.slice(0, 3).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [heroArticle, setHeroArticle] = useState<Article | null>(null);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [editorsPicks, setEditorsPicks] = useState<Article[]>([]);
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);
  const [springCityArticles, setSpringCityArticles] = useState<Article[]>([]);
  const [royersfordArticles, setRoyersfordArticles] = useState<Article[]>([]);
  const [limerickArticles, setLimerickArticles] = useState<Article[]>([]);
  const [upperProvidenceArticles, setUpperProvidenceArticles] = useState<Article[]>([]);
  const [schoolDistrictArticles, setSchoolDistrictArticles] = useState<Article[]>([]);
  const [politicsArticles, setPoliticsArticles] = useState<Article[]>([]);

  // Track homepage view
  usePageTracking({
    viewType: 'homepage',
    trackScroll: true,
  });
  const [businessArticles, setBusinessArticles] = useState<Article[]>([]);
  const [eventsArticles, setEventsArticles] = useState<Article[]>([]);
  const [opinionArticles, setOpinionArticles] = useState<Article[]>([]);
  const [breakingNews, setBreakingNews] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    const now = new Date().toISOString();
    
    // Fetch all main queries in parallel for faster loading
    const [
      heroResult,
      breakingResult,
      featuredResult,
      latestResult,
      trendingResult,
      springCityResult,
      royersfordResult,
      limerickResult,
      upperProvidenceResult,
      schoolDistrictResult,
      politicsResult,
      businessResult,
      eventsResult,
      opinionResult
    ] = await Promise.all([
      // Hero article
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["hero"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(1),
      
      // Breaking news
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .eq("is_breaking", true)
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(10),
      
      // Featured articles (Top Stories by views)
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .lte("published_at", now)
        .order("view_count", { ascending: false })
        .limit(4),
      
      // Latest articles (newest first)
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      // Trending articles (Most Read - past 30 days)
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .lte("published_at", now)
        .gte("published_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("view_count", { ascending: false })
        .limit(5),
      
      // Section queries (all in parallel)
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["spring-city"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["royersford"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["limerick"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["upper-providence"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["school-district"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["politics"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["business"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["events"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3),
      
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", ["opinion"])
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(3)
    ]);

    // Process results
    if (heroResult.data && heroResult.data.length > 0) {
      setHeroArticle(heroResult.data[0] as any);
    }

    if (breakingResult.data && breakingResult.data.length > 0) {
      // Filter active breaking news
      const activeBreaking = breakingResult.data.filter((article: any) => {
        if (!article.breaking_news_set_at) return true;
        const setAt = new Date(article.breaking_news_set_at);
        const duration = article.breaking_news_duration || 24;
        const expiresAt = new Date(setAt.getTime() + duration * 60 * 60 * 1000);
        return new Date() < expiresAt;
      });
      setBreakingNews(activeBreaking as any);
    }

    if (featuredResult.data) {
      setFeaturedArticles(featuredResult.data as any);
    }

    // Handle Editor's Picks (from DB - visible to all users, persists until removed)
    const { data: picksRows } = await supabase
      .from("editors_picks")
      .select("article_id, position")
      .order("position", { ascending: true });
    
    if (picksRows && picksRows.length > 0) {
      const pickIds = picksRows.map((r: { article_id: string }) => r.article_id);
      const { data: picksData } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, excerpt, image_url, author_name, subtitle, section, sections, category, tags")
        .in("id", pickIds)
        .eq("status", "published");
      
      if (picksData) {
        const sortedPicks = pickIds
          .map((id: string) => picksData.find((a: any) => a.id === id))
          .filter(Boolean);
        setEditorsPicks(sortedPicks as any);
      }
    } else if (featuredResult.data) {
      setEditorsPicks(featuredResult.data.slice(0, 3) as any);
    }

    if (latestResult.data) {
      setLatestArticles(latestResult.data as any);
    }

    if (trendingResult.data) {
      setTrendingArticles(trendingResult.data as any);
    }

    // Set section articles
    if (springCityResult.data) setSpringCityArticles(springCityResult.data as any);
    if (royersfordResult.data) setRoyersfordArticles(royersfordResult.data as any);
    if (limerickResult.data) setLimerickArticles(limerickResult.data as any);
    if (upperProvidenceResult.data) setUpperProvidenceArticles(upperProvidenceResult.data as any);
    if (schoolDistrictResult.data) setSchoolDistrictArticles(schoolDistrictResult.data as any);
    if (politicsResult.data) setPoliticsArticles(politicsResult.data as any);
    if (businessResult.data) setBusinessArticles(businessResult.data as any);
    if (eventsResult.data) setEventsArticles(eventsResult.data as any);
    if (opinionResult.data) setOpinionArticles(opinionResult.data as any);

    setLoading(false);
  }

  return (
    <>
      <Header />
      <main className="bg-[color:var(--color-surface)] min-h-screen">
        {/* Breaking News Banner */}
        {breakingNews.length > 0 && (
          <div className="bg-[#1e3a5f] text-white py-3 border-b-2 border-[color:var(--color-riviera-blue)]">
            <div className="mx-auto max-w-7xl px-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="font-black text-xs tracking-wider bg-red-600 px-2 py-1 rounded flex-shrink-0">BREAKING</span>
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide whitespace-nowrap">
                  {breakingNews.map((article, index) => (
                    <div key={article.id} className="flex items-center gap-3">
                      <Link 
                        href={`/article/${article.slug}`} 
                        className="hover:underline font-semibold transition-colors hover:text-[color:var(--color-riviera-blue)]"
                      >
                        {article.title}
                      </Link>
                      {index < breakingNews.length - 1 && (
                        <span className="text-[color:var(--color-riviera-blue)] text-2xl font-bold">•</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Hero Section */}
          <section className="mb-6">
            {loading ? (
              <div className="h-[500px] bg-white rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent mb-4"></div>
                  <p className="text-[color:var(--color-medium)]">Loading hero article...</p>
                </div>
              </div>
            ) : heroArticle ? (
              <ArticleCard article={heroArticle} size="hero" />
            ) : null}
          </section>

          {/* Newsletter */}
          <section className="mb-6">
            <NewsletterForm />
          </section>

          {/* AD SECTION 1: Desktop = 970x90, Mobile = Section 1.2 (300x150) */}
          <section className="mb-8">
            <div className="hidden lg:block">
              <AdSlot slot="homepage-banner-top" className="w-full" />
            </div>
            <div className="lg:hidden">
              <AdSlot slot="homepage-banner-top-mobile" className="w-full" />
            </div>
          </section>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
              <p className="mt-4 text-[color:var(--color-medium)]">Loading articles...</p>
            </div>
          ) : (
            <>
              {/* Main Content Grid: Content + Sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* MAIN CONTENT AREA */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Top Stories */}
                  <section id="top-stories" className="scroll-mt-24">
                    <h2 className="text-2xl font-black text-[color:var(--color-dark)] mb-4 pb-2 border-b-4 border-[color:var(--color-riviera-blue)]">
                      Top Stories
                    </h2>
                    {featuredArticles.length === 0 ? (
                      <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                        <p className="text-[color:var(--color-medium)]">
                          No featured stories yet. Mark articles as "Featured" to display them here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {featuredArticles.map((article) => (
                          <ArticleCard key={article.id} article={article} size="featured" />
                        ))}
                      </div>
                    )}
                  </section>

                  {/* AD SECTION 5 - MAIN CONTENT TOP (hidden on mobile) */}
                  <div className="relative pt-8 hidden lg:block">
                    <AdSlot 
                      slot="homepage-content-top" 
                      className="w-full"
                    />
                  </div>

                  {/* Latest News */}
                  <NewsSection 
                    title="Latest News" 
                    articles={[...latestArticles].sort((a, b) => {
                      const dateA = new Date(a.published_at || a.created_at).getTime();
                      const dateB = new Date(b.published_at || b.created_at).getTime();
                      return dateB - dateA; // Newest first (descending)
                    })} 
                    sectionName="latest"
                  />

                  {/* Mobile: Section 2 ad (300x300) above Most Read */}
                  <div className="pt-8 lg:hidden">
                    <AdSlot slot="homepage-sidebar-top" className="w-full" />
                  </div>

                  {/* Most Read - mobile only: appears under Latest News and Section 2 ad */}
                  <div className="lg:hidden">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-black text-[color:var(--color-dark)] mb-4 pb-2 border-b-2 border-[color:var(--color-riviera-blue)]">
                        Most Read
                      </h3>
                      {trendingArticles.length === 0 ? (
                        <p className="text-sm text-[color:var(--color-medium)] text-center py-4">
                          No articles yet
                        </p>
                      ) : (
                        <div>
                          {trendingArticles.map((article, index) => (
                            <Link
                              key={article.id}
                              href={`/article/${article.slug}`}
                              className="flex gap-3 items-start group py-3 border-b border-gray-200 last:border-0"
                            >
                              <span className="text-2xl font-black text-gray-300 flex-shrink-0">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-[color:var(--color-dark)] group-hover:text-blue-600 transition line-clamp-2">
                                  {article.title}
                                </h4>
                                <p className="text-xs text-[color:var(--color-medium)] mt-1">
                                  {article.view_count.toLocaleString()} views
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spring City */}
                  {springCityArticles.length > 0 && (
                    <NewsSection 
                      title="Spring City" 
                      articles={springCityArticles} 
                      sectionName="spring-city"
                    />
                  )}

                  {/* Royersford */}
                  {royersfordArticles.length > 0 && (
                    <NewsSection 
                      title="Royersford" 
                      articles={royersfordArticles} 
                      sectionName="royersford"
                    />
                  )}

                  {/* AD SECTION 6 - MAIN CONTENT MIDDLE 1 (hidden on mobile) */}
                  <div className="relative pt-8 hidden lg:block">
                    <AdSlot 
                      slot="homepage-content-middle-1" 
                      className="w-full"
                    />
                  </div>

                  {/* Limerick */}
                  {limerickArticles.length > 0 && (
                    <NewsSection 
                      title="Limerick" 
                      articles={limerickArticles} 
                      sectionName="limerick"
                    />
                  )}

                  {/* Upper Providence */}
                  {upperProvidenceArticles.length > 0 && (
                    <NewsSection 
                      title="Upper Providence" 
                      articles={upperProvidenceArticles} 
                      sectionName="upper-providence"
                    />
                  )}

                  {/* School District */}
                  {schoolDistrictArticles.length > 0 && (
                    <NewsSection 
                      title="School District" 
                      articles={schoolDistrictArticles} 
                      sectionName="school-district"
                    />
                  )}

                  {/* AD SECTION 7 - MAIN CONTENT MIDDLE 2 (hidden on mobile) */}
                  <div className="relative pt-8 hidden lg:block">
                    <AdSlot 
                      slot="homepage-content-middle-2" 
                      className="w-full"
                    />
                  </div>

                  {/* Mobile: second 300x300-style ad a few sections down (after School District) */}
                  <div className="pt-8 lg:hidden">
                    <AdSlot slot="homepage-sidebar-middle" className="w-full" />
                  </div>

                  {/* Politics */}
                  {politicsArticles.length > 0 && (
                    <NewsSection 
                      title="Politics" 
                      articles={politicsArticles} 
                      sectionName="politics"
                    />
                  )}

                  {/* Business */}
                  {businessArticles.length > 0 && (
                    <NewsSection 
                      title="Business" 
                      articles={businessArticles} 
                      sectionName="business"
                    />
                  )}

                  {/* Events */}
                  {eventsArticles.length > 0 && (
                    <NewsSection 
                      title="Events" 
                      articles={eventsArticles} 
                      sectionName="events"
                    />
                  )}

                  {/* Opinion */}
                  {opinionArticles.length > 0 && (
                    <NewsSection 
                      title="Opinion" 
                      articles={opinionArticles} 
                      sectionName="opinion"
                    />
                  )}
                </div>

                {/* SIDEBAR */}
                <aside className="lg:col-span-4 space-y-6">
                  {/* AD SECTION 2 - SIDEBAR TOP (desktop only; on mobile shown in main column) */}
                  <div className="relative pt-8 hidden lg:block">
                    <AdSlot 
                      slot="homepage-sidebar-top" 
                      className="w-full"
                    />
                  </div>

                  {/* Most Read - desktop only; on mobile shown under Latest News in main column */}
                  <div className="hidden lg:block bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-black text-[color:var(--color-dark)] mb-4 pb-2 border-b-2 border-[color:var(--color-riviera-blue)]">
                      Most Read
                    </h3>
                    {trendingArticles.length === 0 ? (
                      <p className="text-sm text-[color:var(--color-medium)] text-center py-4">
                        No articles yet
                      </p>
                    ) : (
                      <div>
                        {trendingArticles
                          .map((article, index) => (
                            <Link
                              key={article.id}
                              href={`/article/${article.slug}`}
                              className="flex gap-3 items-start group py-3 border-b border-gray-200 last:border-0"
                            >
                              <span className="text-2xl font-black text-gray-300 flex-shrink-0">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-[color:var(--color-dark)] group-hover:text-blue-600 transition line-clamp-2">
                                  {article.title}
                                </h4>
                                <p className="text-xs text-[color:var(--color-medium)] mt-1">
                                  {article.view_count.toLocaleString()} views
                                </p>
                              </div>
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* AD SECTION 3 - SIDEBAR MIDDLE (desktop only; on mobile shown in main column) */}
                  <div className="relative pt-8 hidden lg:block">
                    <AdSlot 
                      slot="homepage-sidebar-middle" 
                      className="w-full"
                    />
                  </div>

                  {/* Editor's Picks - Curated Content */}
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 shadow-sm border border-blue-100">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-[color:var(--color-riviera-blue)]">
                      <svg className="w-5 h-5 text-[color:var(--color-riviera-blue)]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <h3 className="text-lg font-black text-[color:var(--color-dark)]">
                      Editor's Picks
                    </h3>
                  </div>
                    {editorsPicks.length === 0 ? (
                      <p className="text-sm text-[color:var(--color-medium)] text-center py-4">
                        No editor's picks yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {editorsPicks.map((article) => (
                          <Link
                            key={article.id}
                            href={`/article/${article.slug}`}
                            className="block group"
                          >
                            <div className="py-2">
                              <h4 className="text-sm font-bold text-[color:var(--color-dark)] group-hover:text-blue-600 transition line-clamp-2 mb-1">
                                {article.title}
                              </h4>
                              <p className="text-xs text-[color:var(--color-medium)]">
                                {new Date(article.published_at || "").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric"
                                })}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AD SECTION 4 - SIDEBAR BOTTOM (desktop only on homepage) */}
                  <div className="relative pt-8 hidden lg:block">
                    <AdSlot 
                      slot="homepage-sidebar-bottom" 
                      className="w-full"
                    />
                  </div>
                </aside>
              </div>

              {/* AD SECTION 8 - BOTTOM BANNER */}
              <section className="mt-8 relative pt-8">
                <AdSlot 
                  slot="homepage-banner-bottom" 
                  className="w-full"
                />
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
