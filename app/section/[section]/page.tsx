"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Article } from "@/lib/types/database";
import Link from "next/link";

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
};

export default function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const supabase = createClient();

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

  return (
    <>
      <Header />
      <main className="bg-[color:var(--color-surface)] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8">
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
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition group"
                >
                  {article.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    {article.category && (
                      <span className="inline-block px-2 py-1 text-xs font-bold text-[color:var(--color-riviera-blue)] bg-blue-50 rounded mb-2">
                        {article.category}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-2 group-hover:text-[color:var(--color-riviera-blue)] transition">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-[color:var(--color-medium)] mb-3 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-[color:var(--color-medium)]">
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

