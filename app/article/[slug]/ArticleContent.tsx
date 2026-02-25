"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShareButton } from "@/components/ShareButton";
import { Avatar } from "@/components/Avatar";
import { AdDisplay } from "@/components/AdDisplay";
import { RecommendedArticles } from "@/components/RecommendedArticles";
import type { Article } from "@/lib/types/database";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  trackArticleScrollData,
  trackAuthorClick,
  getSessionId,
  calculateScrollDepth,
} from "@/lib/analytics/tracker";
import { usePageTracking } from "@/lib/analytics/usePageTracking";

type ArticleContentProps = {
  initialArticle: Article;
  slug: string;
};

export function ArticleContent({ initialArticle, slug }: ArticleContentProps) {
  const [article, setArticle] = useState<Article>(initialArticle);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [authorUsername, setAuthorUsername] = useState<string | null>(null);
  const [coAuthorAvatar, setCoAuthorAvatar] = useState<string | null>(null);
  const [coAuthorName, setCoAuthorName] = useState<string | null>(null);
  const [coAuthorUsername, setCoAuthorUsername] = useState<string | null>(null);
  const supabase = createClient();

  // Analytics tracking
  const { sessionId, getCurrentScrollDepth, getTimeSpent } = usePageTracking({
    viewType: 'article',
    articleId: article.id,
    trackScroll: true,
  });

  // Scroll checkpoint tracking
  const scrollCheckpointsRef = useRef<Record<number, number>>({});
  const articleRef = useRef<HTMLElement>(null);
  const entryTimeRef = useRef<number>(Date.now());

  // Track scroll checkpoints
  useEffect(() => {
    const checkpoints = [10, 25, 50, 75, 90, 100];
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercent = calculateScrollDepth();
        
        // Record checkpoint timestamps
        checkpoints.forEach((checkpoint) => {
          if (scrollPercent >= checkpoint && !scrollCheckpointsRef.current[checkpoint]) {
            scrollCheckpointsRef.current[checkpoint] = Date.now();
          }
        });
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);

      // Send scroll data on unmount
      const articleLength = articleRef.current?.scrollHeight || document.documentElement.scrollHeight;
      const maxScroll = getCurrentScrollDepth();
      const timeSpent = getTimeSpent();

      trackArticleScrollData({
        articleId: article.id,
        sessionId: sessionId,
        scrollCheckpoints: scrollCheckpointsRef.current,
        maxScrollPercent: maxScroll,
        articleLengthPixels: articleLength,
        timeSpentSeconds: timeSpent,
        abandonedAtPercent: maxScroll,
      });
    };
  }, [article.id, sessionId, getCurrentScrollDepth, getTimeSpent]);

  useEffect(() => {
    // Increment view count
    async function incrementViews() {
      try {
        const { error } = await supabase.rpc("increment_article_views", { 
          article_id: article.id 
        });
        if (error) {
          console.error("Error incrementing views:", error);
        }
      } catch (err) {
        console.error("Failed to increment views:", err);
      }
    }
    incrementViews();

    // Fetch author profile(s) if author_name exists
    async function fetchAuthorProfile() {
      if (article.author_name) {
        // Check if there are two authors separated by " & "
        const authorNames = article.author_name.includes(' & ') 
          ? article.author_name.split(' & ').map(name => name.trim())
          : [article.author_name.trim()];

        // Function to fetch a single author's profile
        const fetchSingleAuthor = async (authorName: string) => {
          // Clean the author_name (remove any extra text like "(Admin)")
          const cleanAuthorName = authorName.split('(')[0].trim();
          
          // Special case for DiffuseAI
          if (cleanAuthorName.toLowerCase() === 'powered by diffuse.ai' || cleanAuthorName.toLowerCase() === 'diffuse.ai') {
            return {
              avatar_url: null,
              full_name: 'Powered by diffuse.ai',
              username: 'diffuse.ai'
            };
          }
          
          // Try multiple ways to find the author profile
          let { data: authorProfile } = await supabase
            .from("user_profiles")
            .select("avatar_url, full_name, email, username")
            .eq("full_name", cleanAuthorName)
            .limit(1)
            .maybeSingle();

          if (!authorProfile) {
            const { data: profiles } = await supabase
              .from("user_profiles")
              .select("avatar_url, full_name, email, username")
              .limit(100);

            if (profiles) {
              authorProfile = profiles.find(
                (p) => p.full_name?.toLowerCase().trim() === cleanAuthorName.toLowerCase()
              ) || null;
            }
          }

          if (!authorProfile && cleanAuthorName.includes('@')) {
            const { data: emailProfile } = await supabase
              .from("user_profiles")
              .select("avatar_url, full_name, email, username")
              .eq("email", cleanAuthorName)
              .limit(1)
              .maybeSingle();

            if (emailProfile) {
              authorProfile = emailProfile;
            }
          }

          if (!authorProfile) {
            const { data: profiles } = await supabase
              .from("user_profiles")
              .select("avatar_url, full_name, email, username")
              .limit(100);

            if (profiles) {
              authorProfile = profiles.find(
                (p) => 
                  (p.full_name && cleanAuthorName.toLowerCase().includes(p.full_name.toLowerCase())) ||
                  (p.full_name && p.full_name.toLowerCase().includes(cleanAuthorName.toLowerCase()))
              ) || null;
            }
          }

          // Generate a fallback username if none exists
          if (authorProfile && !authorProfile.username) {
            // Generate username from email or full name
            if (authorProfile.email) {
              authorProfile.username = authorProfile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            } else if (authorProfile.full_name) {
              authorProfile.username = authorProfile.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            }
          }
          
          return authorProfile || { full_name: cleanAuthorName, avatar_url: null, username: null };
        };

        // Fetch first author
        const firstAuthor = await fetchSingleAuthor(authorNames[0]);
        setAuthorAvatar(firstAuthor.avatar_url);
        setAuthorName(firstAuthor.full_name);
        setAuthorUsername(firstAuthor.username);

        // If there's a second author, fetch their profile too
        if (authorNames.length > 1) {
          const secondAuthor = await fetchSingleAuthor(authorNames[1]);
          setCoAuthorAvatar(secondAuthor.avatar_url);
          setCoAuthorName(secondAuthor.full_name);
          setCoAuthorUsername(secondAuthor.username);
        }
      }
    }
    fetchAuthorProfile();

    // Fetch related articles from same section
    supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .eq("section", article.section)
      .neq("id", article.id)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setRelatedArticles(data);
        }
      });
  }, [article.id, article.section, article.author_name, supabase]);

  // Format dates with time in EST (e.g. "Jan 22, 2026 at 9:31 AM EST")
  const publishedDate = article.published_at
    ? (() => {
        const d = new Date(article.published_at!);
        const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
        const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York", timeZoneName: "short" });
        return `${datePart} at ${timePart}`;
      })()
    : "";

  const updatedDate = article.updated_at
    ? (() => {
        const d = new Date(article.updated_at);
        const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
        const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York", timeZoneName: "short" });
        return `${datePart} at ${timePart}`;
      })()
    : "";

  // Check if article was updated after publishing (meaningful update)
  const hasUpdate = article.updated_at && article.published_at && 
    new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() > 60000; // More than 1 minute difference

  // Check if breaking news is still active
  const isBreakingNewsActive = article.is_breaking && article.breaking_news_set_at ? (() => {
    const setAt = new Date(article.breaking_news_set_at);
    const duration = article.breaking_news_duration || 24; // Default 24 hours
    const expiresAt = new Date(setAt.getTime() + duration * 60 * 60 * 1000);
    return new Date() < expiresAt;
  })() : article.is_breaking;

  const articleUrl = `/article/${article.slug}`;

  // Never show "Hero" to readers — use real section or category (e.g. Spring City, Public Meetings)
  const displaySection =
    article.section === "hero"
      ? (article.sections?.[0] || article.category || "News").trim() || "News"
      : article.section;
  const displaySectionLabel = displaySection.replace(/-/g, " ");

  return (
    <>
      <Header />
      <main className="bg-[color:var(--color-surface)] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Article Content - 8 columns */}
            <article ref={articleRef} className="lg:col-span-8">
              {/* Advertisement label - subtle, centered, above content */}
              {article.is_advertisement && (
                <div className="mb-4 flex justify-center items-center px-4 py-2 rounded-lg bg-gray-100 border border-gray-200">
                  <span className="text-xs font-medium tracking-wider text-gray-600">advertisement article</span>
                </div>
              )}

              {/* Breadcrumb — never show "Hero"; only real section (e.g. Spring City) */}
              <div className="mb-4 text-sm text-[color:var(--color-medium)]">
                <Link href="/" className="hover:text-[color:var(--color-riviera-blue)]">
                  Home
                </Link>
                <span className="mx-2">›</span>
                <span className="capitalize">{displaySectionLabel}</span>
              </div>

              {/* Article Header */}
              <header className="mb-8">
                {isBreakingNewsActive && (
                  <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded mb-3">
                    BREAKING NEWS
                  </span>
                )}
                <div className="text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wide">
                  {displaySectionLabel.toUpperCase()}
                  {article.category && displaySectionLabel.toLowerCase() !== (article.category || "").toLowerCase() && ` • ${(article.category || "").replace(/-/g, " ").toUpperCase()}`}
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
                    <div className="flex items-center gap-2">
                      {/* First Author */}
                      {authorUsername ? (
                        <Link 
                          href={`/author/${authorUsername}`} 
                          className="flex items-center gap-2 hover:opacity-80 transition"
                          onClick={() => trackAuthorClick({
                            authorName: authorName || article.author_name || 'Unknown',
                            clickedFromPage: 'article',
                            articleId: article.id,
                          })}
                        >
                          <Avatar src={authorAvatar} name={authorName || article.author_name} size="sm" />
                          <span className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline">{authorName || article.author_name}</span>
                        </Link>
                      ) : (
                        <>
                          <Avatar src={authorAvatar} name={authorName || article.author_name} size="sm" />
                          <span className="font-semibold text-[color:var(--color-dark)]">{authorName || article.author_name}</span>
                        </>
                      )}
                      
                      {/* Second Author (if exists) */}
                      {coAuthorName && (
                        <>
                          <span className="text-[color:var(--color-medium)]">&</span>
                          {coAuthorUsername ? (
                            <Link 
                              href={`/author/${coAuthorUsername}`} 
                              className="flex items-center gap-2 hover:opacity-80 transition"
                              onClick={() => trackAuthorClick({
                                authorName: coAuthorName || 'Unknown',
                                clickedFromPage: 'article',
                                articleId: article.id,
                              })}
                            >
                              <Avatar src={coAuthorAvatar} name={coAuthorName} size="sm" />
                              <span className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline">{coAuthorName}</span>
                            </Link>
                          ) : (
                            <>
                              <Avatar src={coAuthorAvatar} name={coAuthorName} size="sm" />
                              <span className="font-semibold text-[color:var(--color-dark)]">{coAuthorName}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <span>•</span>
                    <span>{article.view_count} views</span>
                    <span>•</span>
                    <span>{article.share_count} shares</span>
                    <span>•</span>
                    <ShareButton articleTitle={article.title} articleUrl={articleUrl} articleId={article.id} />
                  </div>
                  <div className="flex flex-col gap-1">
                    Published {publishedDate}
                    {hasUpdate && (
                      <span> (Updated {updatedDate})</span>
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

              {/* Article Content — first ad between block 1 and 2, second ad at bottom */}
              {article.content_blocks && Array.isArray(article.content_blocks) && article.content_blocks.length > 0 ? (
                <>
                  <div className="prose prose-lg max-w-none">
                    {article.content_blocks
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((block: any, index: number) => (
                        <Fragment key={block.id}>
                          {block.type === "text" ? (
                            <div className="text-lg leading-relaxed text-[color:var(--color-dark)] mb-6 article-text-block markdown-content">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({ ...props }) => (
                                    <a
                                      {...props}
                                      className="text-blue-600 hover:text-blue-800 underline font-normal"
                                      target={props.href?.startsWith('http') ? '_blank' : undefined}
                                      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    />
                                  ),
                                  strong: ({ ...props }) => (
                                    <strong {...props} className="font-bold" style={{ fontWeight: 700 }} />
                                  ),
                                  em: ({ ...props }) => (
                                    <em {...props} className="italic" style={{ fontStyle: 'italic' }} />
                                  ),
                                  p: ({ ...props }) => (
                                    <p {...props} className="mb-4 leading-relaxed" />
                                  ),
                                  ul: ({ ...props }) => (
                                    <ul {...props} className="markdown-list markdown-list-ul" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginLeft: '1.5rem' }} />
                                  ),
                                  ol: ({ ...props }) => (
                                    <ol {...props} className="markdown-list markdown-list-ol" style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginLeft: '1.5rem' }} />
                                  ),
                                  li: ({ ...props }) => (
                                    <li {...props} className="markdown-list-item" style={{ marginBottom: '0.5rem' }} />
                                  ),
                                }}
                              >
                                {block.content || ''}
                              </ReactMarkdown>
                            </div>
                          ) : block.type === "image" ? (
                            <figure className="my-8">
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
                          ) : null}
                          {/* First ad after first content block */}
                          {index === 0 && (
                            <div className="my-8 not-prose">
                              <AdDisplay adSlot="article-inline-1" className="w-full" />
                            </div>
                          )}
                        </Fragment>
                      ))}
                  </div>
                  {/* Second ad at bottom of article */}
                  <div className="mt-8 mb-8">
                    <AdDisplay adSlot="article-inline-2" className="w-full" />
                  </div>
                </>
              ) : (
                <>
                  <div className="prose prose-lg max-w-none mb-8 text-lg leading-relaxed text-[color:var(--color-dark)] markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ ...props }) => (
                          <a
                            {...props}
                            className="text-blue-600 hover:text-blue-800 underline font-normal"
                            target={props.href?.startsWith('http') ? '_blank' : undefined}
                            rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                          />
                        ),
                        strong: ({ ...props }) => (
                          <strong {...props} className="font-bold" style={{ fontWeight: 700 }} />
                        ),
                        em: ({ ...props }) => (
                          <em {...props} className="italic" style={{ fontStyle: 'italic' }} />
                        ),
                        p: ({ ...props }) => (
                          <p {...props} className="mb-4 leading-relaxed" />
                        ),
                        ul: ({ ...props }) => (
                          <ul {...props} className="markdown-list markdown-list-ul" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginLeft: '1.5rem' }} />
                        ),
                        ol: ({ ...props }) => (
                          <ol {...props} className="markdown-list markdown-list-ol" style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginLeft: '1.5rem' }} />
                        ),
                        li: ({ ...props }) => (
                          <li {...props} className="markdown-list-item" style={{ marginBottom: '0.5rem' }} />
                        ),
                      }}
                    >
                      {article.content || ''}
                    </ReactMarkdown>
                  </div>
                  {/* Legacy single-body: both ads at bottom */}
                  <div className="mb-8">
                    <AdDisplay adSlot="article-inline-1" className="w-full" />
                  </div>
                  <div className="mb-8">
                    <AdDisplay adSlot="article-inline-2" className="w-full" />
                  </div>
                </>
              )}

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/tag/${encodeURIComponent(tag)}`}
                        className="px-3 py-1 bg-gray-100 text-[color:var(--color-dark)] text-sm font-medium rounded-full hover:bg-[color:var(--color-riviera-blue)] hover:text-white transition"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

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

            {/* Sidebar - Right Side, 4 columns */}
            <aside className="lg:col-span-4">
              <div className="space-y-6">
                {/* TOP SIDEBAR AD - Static, Large, Tall */}
                <div className="w-full">
                  <AdDisplay adSlot="article-sidebar-top" className="w-full" />
                </div>
                
                {/* RECOMMENDED STORIES */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <RecommendedArticles currentArticle={article} limit={3} />
                </div>
                
                {/* BOTTOM SIDEBAR AD - Sticky, follows scroll */}
                <div className="lg:sticky lg:top-4">
                  <AdDisplay adSlot="article-sidebar-bottom" className="w-full" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

