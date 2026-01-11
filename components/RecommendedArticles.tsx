"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Article } from "@/lib/types/database";
import Link from "next/link";

type RecommendedArticlesProps = {
  currentArticle: Article;
  limit?: number;
};

export function RecommendedArticles({ currentArticle, limit = 3 }: RecommendedArticlesProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRecommended() {
      try {
        // First, try to find articles with matching tags
        let { data: taggedArticles } = await supabase
          .from("articles")
          .select("*")
          .eq("status", "published")
          .neq("id", currentArticle.id)
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false })
          .limit(limit * 2); // Get more than we need to filter

        let recommended: Article[] = [];

        if (taggedArticles && currentArticle.tags && currentArticle.tags.length > 0) {
          // Filter articles that share tags
          const articlesWithSharedTags = taggedArticles.filter((article) =>
            article.tags?.some((tag: string) => currentArticle.tags?.includes(tag))
          );
          recommended = articlesWithSharedTags.slice(0, limit);
        }

        // If we don't have enough, fill with articles from same section
        if (recommended.length < limit) {
          const { data: sectionArticles } = await supabase
            .from("articles")
            .select("*")
            .eq("status", "published")
            .eq("section", currentArticle.section)
            .neq("id", currentArticle.id)
            .lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false })
            .limit(limit - recommended.length);

          if (sectionArticles) {
            // Add articles from same section that aren't already in recommended
            const uniqueSectionArticles = sectionArticles.filter(
              (sa) => !recommended.some((ra) => ra.id === sa.id)
            );
            recommended = [...recommended, ...uniqueSectionArticles].slice(0, limit);
          }
        }

        // If still not enough, fill with recent articles
        if (recommended.length < limit) {
          const { data: recentArticles } = await supabase
            .from("articles")
            .select("*")
            .eq("status", "published")
            .neq("id", currentArticle.id)
            .lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false })
            .limit(limit);

          if (recentArticles) {
            const uniqueRecentArticles = recentArticles.filter(
              (ra) => !recommended.some((rec) => rec.id === ra.id)
            );
            recommended = [...recommended, ...uniqueRecentArticles].slice(0, limit);
          }
        }

        setArticles(recommended);
      } catch (error) {
        console.error("Error fetching recommended articles:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommended();
  }, [currentArticle.id, currentArticle.tags, currentArticle.section, limit, supabase]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[color:var(--color-dark)]">Recommended Stories</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Recommended Stories</h3>
      <div className="space-y-4">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/article/${article.slug}`}
            className="block group"
          >
            <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100">
              {article.image_url && (
                <div className="relative h-28 overflow-hidden">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-3">
                <div className="text-xs text-blue-600 font-semibold uppercase mb-1">
                  {article.section}
                </div>
                <h4 className="text-sm font-bold text-[color:var(--color-dark)] group-hover:text-blue-600 transition line-clamp-2 leading-snug">
                  {article.title}
                </h4>
                {article.published_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(article.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}



