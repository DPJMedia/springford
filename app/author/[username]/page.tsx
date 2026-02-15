"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Avatar } from "@/components/Avatar";
import type { Article, UserProfile } from "@/lib/types/database";
import Link from "next/link";
import { usePageTracking } from "@/lib/analytics/usePageTracking";

export default function AuthorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Track author page view
  usePageTracking({
    viewType: 'author',
    trackScroll: true,
  });

  useEffect(() => {
    async function fetchAuthorAndArticles() {
      // Special case for DiffuseAI
      if (username === 'diffuse.ai') {
        // Create a virtual author profile for DiffuseAI
        setAuthor({
          id: 'diffuse-ai',
          full_name: 'Powered by diffuse.ai',
          username: 'diffuse.ai',
          email: 'diffuse@ai.com',
          avatar_url: null,
          is_admin: false,
          is_super_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as UserProfile);

        // Fetch articles that have "Powered by diffuse.ai" in author_name
        const { data: articlesData } = await supabase
          .from("articles")
          .select("*")
          .eq("status", "published")
          .or('author_name.ilike.%Powered by diffuse.ai%,author_name.ilike.%diffuse.ai%')
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false });

        if (articlesData) {
          setArticles(articlesData);
        }
      } else {
        // Regular author profile lookup - try username first
        let { data: authorData } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("username", username)
          .single();

        // If no username match, try to find by email prefix (username might be email-based)
        if (!authorData) {
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("*")
            .or(`email.ilike.${username}%,full_name.ilike.%${username}%`);
          
          if (profiles && profiles.length > 0) {
            authorData = profiles[0];
          }
        }

        // If still not found, try to match by generating username from profiles
        if (!authorData) {
          const { data: allProfiles } = await supabase
            .from("user_profiles")
            .select("*")
            .in("is_admin", [true])
            .or("is_super_admin.eq.true");
          
          if (allProfiles) {
            // Try to find profile where generated username matches
            authorData = allProfiles.find(profile => {
              const generatedUsername = profile.email 
                ? profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
                : profile.full_name?.toLowerCase().replace(/[^a-z0-9]/g, '');
              return generatedUsername === username;
            }) || null;
          }
        }

        if (authorData) {
          setAuthor(authorData);

          // Fetch articles by this author - try both author_id and author_name
          const { data: articlesData } = await supabase
            .from("articles")
            .select("*")
            .eq("status", "published")
            .or(`author_id.eq.${authorData.id},author_name.ilike.%${authorData.full_name}%`)
            .lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false });

          if (articlesData) {
            setArticles(articlesData);
          }
        }
      }

      setLoading(false);
    }

    fetchAuthorAndArticles();
  }, [username, supabase]);

  const formattedDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Check if this is DiffuseAI author page
  const isDiffuseAI = username === 'diffuse.ai';

  return (
    <>
      <Header />
      <main className={isDiffuseAI ? "bg-[#000000] min-h-screen" : "bg-[color:var(--color-surface)] min-h-screen"} style={isDiffuseAI ? { fontFamily: 'var(--font-space-grotesk)' } : {}}>
        <div className="mx-auto max-w-7xl px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
              <p className="mt-4 text-[color:var(--color-medium)]">Loading author profile...</p>
            </div>
          ) : !author ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-[color:var(--color-medium)] text-lg mb-4">
                Author not found.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-[color:var(--color-riviera-blue)] font-semibold hover:underline"
              >
                ← Back to Home
              </Link>
            </div>
          ) : (
            <>
              {/* Author Profile Header */}
              {isDiffuseAI ? (
                <div className="relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_20px_25px_-5px_rgba(255,150,40,0.3)] mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff9628]/10 via-transparent to-[#c086fa]/10 opacity-50"></div>
                  <div className="relative flex items-center justify-between gap-6 flex-wrap">
                    <div className="flex items-center gap-6">
                      <Avatar 
                        src={author.avatar_url} 
                        name={author.full_name} 
                        size="xl"
                      />
                      <div className="flex-1">
                        <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
                          diffuse<span className="text-[#ff9628]">.ai</span>
                        </h1>
                        <p className="text-xl text-[#dbdbdb] mb-2">
                          AI-Powered Content Generation
                        </p>
                        <p className="text-[#dbdbdb]">
                          {articles.length} article{articles.length !== 1 ? 's' : ''} published
                        </p>
                      </div>
                    </div>
                    <Link
                      href="https://diffuse-ai-blush.vercel.app/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-gradient-to-r from-[#ff9628] to-[#ff7300] text-white font-bold rounded-xl hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.5)] hover:scale-105 transition-all duration-200 flex items-center gap-2"
                    >
                      Visit diffuse.ai
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 shadow-sm mb-8">
                  <div className="flex items-center gap-6">
                    <Avatar 
                      src={author.avatar_url} 
                      name={author.full_name} 
                      size="xl"
                    />
                    <div className="flex-1 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-4xl font-black text-[color:var(--color-dark)]">
                            {author.full_name}
                          </h1>
                          {author.newsletter_subscribed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Premium Member
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-[color:var(--color-medium)]">
                              Basic Tier
                            </span>
                          )}
                        </div>
                        <p className="text-lg text-[color:var(--color-medium)] mb-1 mt-2">
                          @{author.username}
                        </p>
                        <p className="text-[color:var(--color-medium)]">
                          {articles.length} article{articles.length !== 1 ? 's' : ''} published
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Articles by this author */}
              <div className="mb-6">
                {isDiffuseAI ? (
                  <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b-2 border-[#ff9628]" style={{ letterSpacing: '-0.01em' }}>
                    AI-Generated Articles
                  </h2>
                ) : (
                  <h2 className="text-2xl font-black text-[color:var(--color-dark)] mb-6 pb-2 border-b-4 border-[color:var(--color-riviera-blue)]">
                    Articles by {author.full_name}
                  </h2>
                )}
              </div>

              {articles.length === 0 ? (
                <div className={isDiffuseAI ? "bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center" : "bg-white rounded-lg p-12 text-center"}>
                  <p className={isDiffuseAI ? "text-[#dbdbdb] text-lg" : "text-[color:var(--color-medium)] text-lg"}>
                    This author hasn't published any articles yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="block group"
                    >
                      {isDiffuseAI ? (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden hover:border-[#ff9628]/50 hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.3)] transition-all duration-300 h-full flex flex-col">
                          {article.image_url ? (
                            <div className="relative h-48 overflow-hidden flex-shrink-0">
                              <img
                                src={article.image_url}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="relative h-48 overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#ff9628]/20 via-[#141414] to-[#c086fa]/20 flex items-center justify-center">
                              <svg className="w-20 h-20 text-[#ff9628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                              </svg>
                            </div>
                          )}
                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-xl text-white mb-2 group-hover:text-[#ff9628] transition line-clamp-2" style={{ letterSpacing: '-0.01em', lineHeight: '1.3' }}>
                              {article.title}
                            </h3>
                            {article.excerpt && (
                              <p className="text-[#dbdbdb] text-sm mb-3 flex-1 line-clamp-3" style={{ lineHeight: '1.6' }}>
                                {article.excerpt}
                              </p>
                            )}
                            <div className="text-xs text-[#545454] mt-auto flex items-center gap-2">
                              <span>{formattedDate(article.published_at)}</span>
                              <span className="text-[#ff9628]">•</span>
                              <span>{article.view_count} views</span>
                            </div>
                          </div>
                        </div>
                      ) : (
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
                              {formattedDate(article.published_at)} • {article.view_count} views
                            </div>
                          </div>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}



