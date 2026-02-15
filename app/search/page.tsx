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
            <div className="lg:col-span-8">
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
                <div className="py-16 text-center">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
                  <p className="mt-4 text-[color:var(--color-medium)]">Searching articles...</p>
                </div>
              ) : articles.length === 0 && q.trim() ? (
                <div className="py-16 text-center rounded-lg bg-white border-2 border-dashed border-[color:var(--color-border)]">
                  <p className="text-[color:var(--color-medium)]">No articles matched your search.</p>
                  <p className="mt-2 text-sm text-[color:var(--color-medium)]">Try different keywords or check spelling.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="block group rounded-lg bg-white p-4 sm:p-5 shadow-sm ring-1 ring-[color:var(--color-border)] hover:shadow-md hover:ring-[color:var(--color-riviera-blue)]/50 transition"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {article.image_url && (
                          <div className="flex-shrink-0 w-full sm:w-40 h-32 sm:h-28 rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={article.image_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-[color:var(--color-dark)] group-hover:text-[color:var(--color-riviera-blue)] transition line-clamp-2">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="mt-2 text-sm text-[color:var(--color-medium)] line-clamp-2">
                              {article.excerpt}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-medium)]">
                            {article.category && (
                              <span className="font-semibold uppercase tracking-wider">{article.category}</span>
                            )}
                            {article.category && <span>•</span>}
                            <time dateTime={article.published_at || ""}>{formattedDate(article.published_at)}</time>
                            {article.author_name && (
                              <>
                                <span>•</span>
                                <span>{article.author_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar - 300x300 Ad */}
            <aside className="lg:col-span-4 space-y-6">
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
        <main className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
        </main>
      </>
    }>
      <SearchContent />
    </Suspense>
  );
}
