"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Article } from "@/lib/types/database";
import Link from "next/link";
import { usePageTracking } from "@/lib/analytics/usePageTracking";

// Define category filters for Town Council section
const TOWN_COUNCIL_FILTERS = [
  { value: "all", label: "All" },
  { value: "town-council", label: "Town Council" },
  { value: "town-decisions", label: "Town Decisions" },
  { value: "board-of-education", label: "Board of Education" },
  { value: "local-governance", label: "Local Governance" },
  { value: "public-meetings", label: "Public Meetings" },
];

const SECTION_TITLES: Record<string, string> = {
  "town-council": "Town Council",
  "business": "Business",
  "sports-entertainment": "Sports & Entertainment",
  "technology": "Technology",
  "opinion": "Opinion",
  "latest": "Latest News",
  "spring-city": "Spring City",
  "royersford": "Royersford",
  "limerick": "Limerick",
  "upper-providence": "Upper Providence",
  "school-district": "School District",
  "politics": "Politics",
  "events": "Events",
};

export default function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const supabase = createClient();

  // Track section page view
  usePageTracking({
    viewType: 'section',
    trackScroll: true,
  });

  const sectionTitle = SECTION_TITLES[section] || section.charAt(0).toUpperCase() + section.slice(1);
  const showFilters = section === "town-council";

  useEffect(() => {
    async function fetchArticlesBySection() {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .contains("sections", [section])
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });

      if (data) {
        setArticles(data);
        setFilteredArticles(data);
      }
      setLoading(false);
    }

    fetchArticlesBySection();
  }, [section, supabase]);

  useEffect(() => {
    if (selectedFilter === "all") {
      setFilteredArticles(articles);
    } else {
      // Filter by category
      const filtered = articles.filter((article) => 
        article.category && article.category.toLowerCase() === selectedFilter
      );
      setFilteredArticles(filtered);
    }
  }, [selectedFilter, articles]);

  const formattedDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const stripExcerptHtml = (text: string | null) => {
    if (!text || typeof text !== "string") return "";
    return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  };

  return (
    <>
      <Header />
      <main className="bg-[color:var(--color-surface)] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Go back to homepage */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-riviera-blue)] hover:underline mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go back to homepage
          </Link>

          {/* Section Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-[color:var(--color-dark)] mb-2">
              {sectionTitle}
            </h1>
            <p className="text-[color:var(--color-medium)]">
              {filteredArticles.length} {filteredArticles.length === 1 ? "article" : "articles"}
            </p>
          </div>

          {/* Category Filters (only for Town Council) */}
          {showFilters && (
            <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">Filter by Category:</p>
              <div className="flex flex-wrap gap-2">
                {TOWN_COUNCIL_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedFilter(filter.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      selectedFilter === filter.value
                        ? "bg-[color:var(--color-riviera-blue)] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-[color:var(--color-medium)]">
                No articles found {selectedFilter !== "all" && `in "${TOWN_COUNCIL_FILTERS.find(f => f.value === selectedFilter)?.label}"`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.slug}`}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full"
                >
                  {article.image_url && (
                    <div className="relative aspect-video overflow-hidden flex-shrink-0">
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
                  )}
                  <div className="p-4 flex flex-col flex-1 min-h-0">
                    <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-2 group-hover:text-[color:var(--color-riviera-blue)] transition line-clamp-2 min-h-[3.25rem] flex-shrink-0">
                      {article.title}
                    </h3>
                    {article.excerpt ? (
                      <p className="text-sm text-[color:var(--color-medium)] mb-3 line-clamp-3 min-h-[3.75rem] flex-shrink-0">
                        {stripExcerptHtml(article.excerpt)}
                      </p>
                    ) : (
                      <div className="min-h-[3.75rem] mb-3 flex-shrink-0" />
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-[color:var(--color-medium)] flex-shrink-0">
                      <span>{article.author_name || "Staff"}</span>
                      <span>{formattedDate(article.published_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}



