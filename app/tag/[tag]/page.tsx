"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Article } from "@/lib/types/database";
import Link from "next/link";

export default function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = use(params);
  const decodedTag = decodeURIComponent(tag);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchArticlesByTag() {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });

      if (data) {
        // Filter articles that contain this tag
        const filtered = data.filter((article) => 
          article.tags && article.tags.includes(decodedTag)
        );
        setArticles(filtered);
      }
      setLoading(false);
    }

    fetchArticlesByTag();
  }, [decodedTag, supabase]);

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
          {/* Tag Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-[color:var(--color-dark)] mb-2">
              #{decodedTag}
            </h1>
            <p className="text-[color:var(--color-medium)]">
              {loading ? "Loading..." : `${articles.length} article${articles.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
              <p className="mt-4 text-[color:var(--color-medium)]">Loading articles...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-[color:var(--color-medium)] text-lg">
                No articles found with this tag.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-[color:var(--color-riviera-blue)] font-semibold hover:underline"
              >
                ← Back to Home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.slug}`}
                  className="block group"
                >
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
                      <h3 className="font-bold text-lg text-[color:var(--color-dark)] mb-2 group-hover:text-blue-600 transition line-clamp-2">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-[color:var(--color-medium)] text-sm mb-3 flex-1 line-clamp-3">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="text-xs text-[color:var(--color-medium)] mt-auto">
                        {article.author_name} • {formattedDate(article.published_at)}
                      </div>
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

