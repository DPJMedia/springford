"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShareButton } from "@/components/ShareButton";
import { ArticleMetadata } from "@/components/ArticleMetadata";
import type { Article } from "@/lib/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchArticle();
  }, [resolvedParams.slug]);

  async function fetchArticle() {
    // Fetch the article
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", resolvedParams.slug)
      .eq("status", "published")
      .single();

    if (error || !data) {
      router.push("/");
      return;
    }

    setArticle(data);

    // Increment view count
    await supabase.rpc("increment_article_views", { article_id: data.id });

    // Fetch related articles from same section
    const { data: related } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .eq("section", data.section)
      .neq("id", data.id)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(3);

    if (related) {
      setRelatedArticles(related);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
            <p className="mt-4 text-[color:var(--color-medium)]">Loading article...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!article) {
    return null;
  }

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const updatedDate = article.updated_at
    ? new Date(article.updated_at).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  // Check if article was updated after publication (more than 1 minute difference)
  const wasUpdated = article.published_at && article.updated_at && 
    new Date(article.updated_at).getTime() > new Date(article.published_at).getTime() + 60000;

  const articleUrl = `/article/${article.slug}`
  const fullArticleUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${articleUrl}`
    : `https://springford.press${articleUrl}`

  return (
    <>
      <ArticleMetadata
        title={article.meta_title || article.title}
        description={article.meta_description || article.excerpt || article.title}
        imageUrl={article.image_url}
        articleUrl={articleUrl}
      />
      <Header />
      <main className="bg-[color:var(--color-surface)] min-h-screen">
        <article className="mx-auto max-w-4xl px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-4 text-sm text-[color:var(--color-medium)]">
            <Link href="/" className="hover:text-[color:var(--color-riviera-blue)]">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="capitalize">{article.section}</span>
          </div>

          {/* Article Header */}
          <header className="mb-8">
            {article.is_breaking && (
              <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded mb-3">
                BREAKING NEWS
              </span>
            )}
            <div className="text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wide">
              {article.section}
              {article.category && ` • ${article.category}`}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[color:var(--color-dark)] mb-4 leading-tight">
              {article.title}
            </h1>
            {article.subtitle && (
              <h2 className="text-xl md:text-2xl text-[color:var(--color-medium)] mb-4">
                {article.subtitle}
              </h2>
            )}
            <div className="flex flex-col gap-2 text-sm text-[color:var(--color-medium)] pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-[color:var(--color-dark)]">{article.author_name}</span>
                <span>•</span>
                <span>{article.view_count} views</span>
                <span>•</span>
                <ShareButton articleTitle={article.title} articleUrl={articleUrl} articleId={article.id} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs">
                  <span className="font-semibold text-[color:var(--color-dark)]">Published:</span> {publishedDate}
                </span>
                {wasUpdated && (
                  <span className="text-xs">
                    <span className="font-semibold text-[color:var(--color-dark)]">Updated:</span> {updatedDate}
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {article.image_url && (
            <figure className="mb-8">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-auto rounded-lg shadow-lg"
              />
              {(article.image_caption || article.image_credit) && (
                <figcaption className="mt-2 text-sm text-[color:var(--color-medium)] italic">
                  {article.image_caption}
                  {article.image_credit && ` Photo: ${article.image_credit}`}
                </figcaption>
              )}
            </figure>
          )}

          {/* TOP ARTICLE AD */}
          <div className="mb-8">
            <AdPlaceholder size="LARGE RECTANGLE (336x280)" position="Article Top" />
          </div>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none mb-8">
            {article.content_blocks && Array.isArray(article.content_blocks) && article.content_blocks.length > 0 ? (
              // Render blocks
              article.content_blocks
                .sort((a: any, b: any) => a.order - b.order)
                .map((block: any) => {
                  if (block.type === "text") {
                    return (
                      <div
                        key={block.id}
                        className="text-lg leading-relaxed text-[color:var(--color-dark)] mb-6 article-text-block"
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {block.content}
                      </div>
                    );
                  } else if (block.type === "image") {
                    return (
                      <figure key={block.id} className="my-8">
                        <img
                          src={block.url}
                          alt={block.caption || "Article image"}
                          className="w-full rounded-lg shadow-lg"
                        />
                        {(block.caption || block.credit) && (
                          <figcaption className="mt-3 text-sm text-[color:var(--color-medium)] italic">
                            {block.caption}
                            {block.credit && ` - Photo: ${block.credit}`}
                          </figcaption>
                        )}
                      </figure>
                    );
                  }
                  return null;
                })
            ) : (
              // Fallback for legacy content
              <div
                className="text-lg leading-relaxed text-[color:var(--color-dark)] whitespace-pre-wrap"
              >
                {article.content}
              </div>
            )}
          </div>

          {/* MIDDLE ARTICLE AD */}
          <div className="mb-8">
            <AdPlaceholder size="MEDIUM RECTANGLE (300x250)" position="Article Middle" />
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-[color:var(--color-dark)] text-sm font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* BOTTOM ARTICLE AD */}
          <div className="mb-8">
            <AdPlaceholder size="LEADERBOARD (728x90)" position="Article Bottom" />
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-2xl font-black text-[color:var(--color-dark)] mb-6">
                Related Stories
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/article/${related.slug}`}
                    className="block group"
                  >
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                      {related.image_url && (
                        <div className="relative h-40 overflow-hidden">
                          <img
                            src={related.image_url}
                            alt={related.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h4 className="text-base font-bold text-[color:var(--color-dark)] group-hover:text-blue-600 transition line-clamp-3">
                          {related.title}
                        </h4>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}

