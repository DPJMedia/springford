"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsletterForm } from "@/components/NewsletterForm";
import type { Article } from "@/lib/types/database";
import Link from "next/link";

// Ad Placement Component
function AdPlaceholder({ size, position }: { size: string; position: string }) {
  return (
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-3xl mb-2">📢</div>
        <p className="font-bold text-gray-700 text-sm mb-1">{size}</p>
        <p className="text-xs text-gray-600">{position}</p>
      </div>
    </div>
  );
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
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            {article.is_breaking && (
              <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded mb-3">
                BREAKING NEWS
              </span>
            )}
            <h1 className="text-4xl font-black leading-tight mb-3 group-hover:text-blue-400 transition">
              {article.title}
            </h1>
            {article.subtitle && (
              <p className="text-xl text-gray-200 mb-3">{article.subtitle}</p>
            )}
            {article.excerpt && (
              <p className="text-base text-gray-300 line-clamp-2">{article.excerpt}</p>
            )}
            <div className="mt-4 text-sm text-gray-400">
              {article.author_name} • {formattedDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (size === "featured") {
    return (
      <Link href={`/article/${article.slug}`} className="block group h-full">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition h-full flex flex-col">
          {article.image_url ? (
            <div className="relative h-48 overflow-hidden flex-shrink-0">
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
          <div className="p-5 flex-1 flex flex-col">
            <h3 className={`font-bold text-[color:var(--color-dark)] mb-2 group-hover:text-blue-600 transition ${article.image_url ? 'text-xl line-clamp-3' : 'text-2xl line-clamp-4'}`}>
              {article.title}
            </h3>
            {article.excerpt && (
              <p className={`text-[color:var(--color-medium)] mb-3 flex-1 ${article.image_url ? 'text-sm line-clamp-2' : 'text-base line-clamp-3'}`}>
                {article.excerpt}
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
      <Link href={`/article/${article.slug}`} className="block group py-3 border-b border-gray-200 last:border-0">
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
            <h4 className="text-sm font-bold text-[color:var(--color-dark)] mb-1 group-hover:text-blue-600 transition line-clamp-2">
              {article.title}
            </h4>
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
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="relative h-40 overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 via-blue-50 to-gray-100 flex items-center justify-center">
            <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className={`font-bold text-[color:var(--color-dark)] mb-2 group-hover:text-blue-600 transition ${article.image_url ? 'text-base line-clamp-2' : 'text-lg line-clamp-3'}`}>
            {article.title}
          </h3>
          {article.excerpt && (
            <p className={`text-[color:var(--color-medium)] mb-2 flex-1 ${article.image_url ? 'text-sm line-clamp-2' : 'text-base line-clamp-4'}`}>
              {article.excerpt}
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
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);
  const [politicsArticles, setPoliticsArticles] = useState<Article[]>([]);
  const [businessArticles, setBusinessArticles] = useState<Article[]>([]);
  const [localArticles, setLocalArticles] = useState<Article[]>([]);
  const [sportsArticles, setSportsArticles] = useState<Article[]>([]);
  const [worldArticles, setWorldArticles] = useState<Article[]>([]);
  const [technologyArticles, setTechnologyArticles] = useState<Article[]>([]);
  const [entertainmentArticles, setEntertainmentArticles] = useState<Article[]>([]);
  const [opinionArticles, setOpinionArticles] = useState<Article[]>([]);
  const [breakingNews, setBreakingNews] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    // Fetch hero article (check if 'hero' is in sections array)
    const { data: heroData } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .contains("sections", ["hero"])
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(1);

    if (heroData && heroData.length > 0) {
      setHeroArticle(heroData[0]);
    }

    // Fetch breaking news (multiple articles)
    const { data: breakingData } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .eq("is_breaking", true)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(10); // Get up to 10 breaking news articles

    if (breakingData && breakingData.length > 0) {
      // Filter only breaking news that's still active based on duration
      const activeBreaking = breakingData.filter((article: any) => {
        if (!article.breaking_news_set_at) return true; // Show if no timestamp set (backwards compatible)
        
        const setAt = new Date(article.breaking_news_set_at);
        const duration = article.breaking_news_duration || 24; // Default 24 hours
        const expiresAt = new Date(setAt.getTime() + duration * 60 * 60 * 1000);
        
        return new Date() < expiresAt; // Only show if not expired
      });
      
      setBreakingNews(activeBreaking);
    }

    // Fetch featured articles (for Top Stories)
    const { data: featuredData } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .eq("is_featured", true)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(4);

    if (featuredData) {
      setFeaturedArticles(featuredData);
    }

    // Fetch latest articles
    const { data: latestData } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(8);

    if (latestData) {
      setLatestArticles(latestData);
      setTrendingArticles(latestData.slice(0, 5));
    }

    // Fetch articles by section
    const sections = [
      { name: 'politics', setter: setPoliticsArticles },
      { name: 'business', setter: setBusinessArticles },
      { name: 'local', setter: setLocalArticles },
      { name: 'sports', setter: setSportsArticles },
      { name: 'world', setter: setWorldArticles },
      { name: 'technology', setter: setTechnologyArticles },
      { name: 'entertainment', setter: setEntertainmentArticles },
      { name: 'opinion', setter: setOpinionArticles },
    ];

    for (const section of sections) {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", [section.name])
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(3);

      if (data) {
        section.setter(data);
      }
    }

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
            {heroArticle ? (
              <ArticleCard article={heroArticle} size="hero" />
            ) : (
              <div className="h-[500px] bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📰</div>
                  <p className="text-xl font-bold text-[color:var(--color-dark)] mb-2">Hero Article Space</p>
                  <p className="text-[color:var(--color-medium)]">
                    Create an article and set section to "Hero" to feature it here
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Newsletter */}
          <section className="mb-6">
            <NewsletterForm />
          </section>

          {/* TOP AD SPACE */}
          <section className="mb-8">
            <AdPlaceholder size="LEADERBOARD (728x90)" position="Top Banner - High Visibility" />
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

                  {/* MID-CONTENT AD */}
                  <div>
                    <AdPlaceholder size="LARGE RECTANGLE (336x280)" position="Mid-Content Ad" />
                  </div>

                  {/* Latest News */}
                  <NewsSection 
                    title="Latest News" 
                    articles={latestArticles} 
                    sectionName="latest"
                  />

                  {/* Politics */}
                  <NewsSection 
                    title="Politics" 
                    articles={politicsArticles} 
                    sectionName="politics"
                  />

                  {/* BETWEEN SECTIONS AD */}
                  <div>
                    <AdPlaceholder size="MEDIUM RECTANGLE (300x250)" position="Between Sections" />
                  </div>

                  {/* Business */}
                  <NewsSection 
                    title="Business" 
                    articles={businessArticles} 
                    sectionName="business"
                  />

                  {/* Local */}
                  <NewsSection 
                    title="Local" 
                    articles={localArticles} 
                    sectionName="local"
                  />

                  {/* BETWEEN SECTIONS AD */}
                  <div>
                    <AdPlaceholder size="MEDIUM RECTANGLE (300x250)" position="Between Sections" />
                  </div>

                  {/* Sports */}
                  <NewsSection 
                    title="Sports" 
                    articles={sportsArticles} 
                    sectionName="sports"
                  />

                  {/* World */}
                  <NewsSection 
                    title="World" 
                    articles={worldArticles} 
                    sectionName="world"
                  />

                  {/* Technology */}
                  <NewsSection 
                    title="Technology" 
                    articles={technologyArticles} 
                    sectionName="technology"
                  />

                  {/* Entertainment */}
                  <NewsSection 
                    title="Entertainment" 
                    articles={entertainmentArticles} 
                    sectionName="entertainment"
                  />

                  {/* Opinion */}
                  <NewsSection 
                    title="Opinion" 
                    articles={opinionArticles} 
                    sectionName="opinion"
                  />
                </div>

                {/* SIDEBAR */}
                <aside className="lg:col-span-4 space-y-6">
                  {/* SIDEBAR AD 1 - TOP */}
                  <div className="sticky top-6">
                    <AdPlaceholder size="MEDIUM RECTANGLE (300x250)" position="Sidebar Top - Sticky" />
                  </div>

                  {/* Trending */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-black text-[color:var(--color-dark)] mb-4 pb-2 border-b-2 border-[color:var(--color-riviera-blue)]">
                      Trending Now
                    </h3>
                    {trendingArticles.length === 0 ? (
                      <p className="text-sm text-[color:var(--color-medium)] text-center py-4">
                        No trending articles yet
                      </p>
                    ) : (
                      <div>
                        {trendingArticles.map((article) => (
                          <ArticleCard key={article.id} article={article} size="compact" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SIDEBAR AD 2 */}
                  <div>
                    <AdPlaceholder size="MEDIUM RECTANGLE (300x250)" position="Sidebar Middle" />
                  </div>

                  {/* Most Read */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-black text-[color:var(--color-dark)] mb-4 pb-2 border-b-2 border-[color:var(--color-riviera-blue)]">
                      Most Read
                    </h3>
                    {latestArticles.length === 0 ? (
                      <p className="text-sm text-[color:var(--color-medium)] text-center py-4">
                        No articles yet
                      </p>
                    ) : (
                      <div>
                        {latestArticles
                          .sort((a, b) => b.view_count - a.view_count)
                          .slice(0, 5)
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
                              </div>
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* SIDEBAR AD 3 - BOTTOM */}
                  <div>
                    <AdPlaceholder size="SKYSCRAPER (160x600)" position="Sidebar Bottom - Sticky Tall" />
                  </div>
                </aside>
              </div>

              {/* BOTTOM AD SPACE */}
              <section className="mt-8">
                <AdPlaceholder size="LEADERBOARD (728x90)" position="Bottom Banner - Exit Intent" />
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
