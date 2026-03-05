"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdDisplay } from "@/components/AdDisplay";
import Link from "next/link";
import type { Article } from "@/lib/types/database";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSearch() {
      if (!q.trim()) {
        setArticles([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setArticles(data.articles || []);
      } catch {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSearch();
  }, [q]);

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
      <main className="min-h-screen bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content - Search Results */}
            <div className="lg:col-span-9">
              <div className="mb-6">
                <p className="text-sm text-[color:var(--color-medium)] mb-2">
                  {loading
                    ? "Searching..."
                    : articles.length > 0
                      ? `${articles.length} result${articles.length === 1 ? "" : "s"} for "${q}"`
                      : q.trim()
                        ? `No results for "${q}"`
                        : "Enter a search term above"}
                </p>
                {/* Search input bar */}
                <form
                  action="/search"
                  method="GET"
                  className="flex gap-2 mb-6"
                >
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search articles..."
                    className="flex-1 rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]/30"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[color:var(--color-riviera-blue)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                </form>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-lg overflow-hidden bg-gray-200 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
                      <div className="h-40 w-full" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-gray-300/60 rounded w-4/5" />
                        <div className="h-4 bg-gray-300/60 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : articles.length === 0 && q.trim() ? (
                <div className="py-16 text-center rounded-lg bg-white border-2 border-dashed border-[color:var(--color-border)]">
                  <p className="text-[color:var(--color-medium)]">No articles matched your search.</p>
                  <p className="mt-2 text-sm text-[color:var(--color-medium)]">Try different keywords or check spelling.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full"
                    >
                      {article.image_url ? (
                        <div className="relative aspect-video overflow-hidden flex-shrink-0">
                          <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="relative aspect-video overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 via-blue-50 to-gray-100 flex items-center justify-center">
                          <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1 min-h-0">
                        <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-2 group-hover:text-[color:var(--color-riviera-blue)] transition line-clamp-2 min-h-[3.25rem] flex-shrink-0">
                          {article.title}
                        </h3>
                        {article.excerpt ? (
                          <p className="text-sm text-[color:var(--color-medium)] mb-3 line-clamp-3 min-h-[3.75rem] flex-shrink-0">
                            {article.excerpt.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()}
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

            {/* Sidebar - Ad */}
            <aside className="lg:col-span-3 space-y-6">
              <div className="sticky top-24">
                <p className="text-[10px] text-[color:var(--color-medium)] mb-2 uppercase tracking-wider">Advertisement</p>
                <AdDisplay adSlot="homepage-sidebar-top" className="w-full aspect-square rounded-lg overflow-hidden" />
              </div>
            </aside>
          </div>

          {/* Bottom Banner - 728x90 */}
          <section className="mt-12 pt-8 border-t border-[color:var(--color-border)]">
            <p className="text-[10px] text-[color:var(--color-medium)] mb-2 uppercase tracking-wider">Advertisement</p>
            <AdDisplay adSlot="homepage-content-top" className="w-full" />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main className="min-h-screen bg-[color:var(--color-surface)]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-gray-200 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
                  <div className="h-40 w-full" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-300/60 rounded w-4/5" />
                    <div className="h-4 bg-gray-300/60 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </>
    }>
      <SearchContent />
    </Suspense>
  );
}
