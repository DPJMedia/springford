"use client";

import { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Avatar } from "@/components/Avatar";
import type { Article, AuthorRow, UserProfile } from "@/lib/types/database";
import { ARTICLE_LIST_COLUMNS } from "@/lib/supabase/articleQueries";
import {
  DIFFUSE_AI_AVATAR_PUBLIC_PATH,
  DIFFUSE_AI_BYLINE_DISPLAY,
} from "@/lib/branding/diffuse";
import Link from "next/link";
import { usePageTracking } from "@/lib/analytics/usePageTracking";
import { useTenant } from "@/lib/tenant/TenantProvider";

type ResolvedSource = "managed" | "diffuse" | "user_profile";

export default function AuthorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { id: tenantId } = useTenant();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Either-or: a row from the new `authors` table OR a legacy user_profiles row.
  const [managedAuthor, setManagedAuthor] = useState<AuthorRow | null>(null);
  const [legacyAuthor, setLegacyAuthor] = useState<UserProfile | null>(null);
  const [source, setSource] = useState<ResolvedSource | null>(null);

  const [articles, setArticles] = useState<Article[]>([]);

  usePageTracking({ tenantId, viewType: "author", trackScroll: true });

  useEffect(() => {
    async function checkAdminStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin, is_super_admin")
        .eq("id", user.id)
        .single();
      if (profile?.is_admin || profile?.is_super_admin) setIsAdmin(true);
    }
    void checkAdminStatus();
  }, [supabase]);

  useEffect(() => {
    async function resolveAuthor() {
      setLoading(true);
      setManagedAuthor(null);
      setLegacyAuthor(null);

      // 1. PREFERRED PATH — look up in the new `authors` table.
      //    Anything created/edited in /admin/authors is the canonical
      //    source of truth and renders the rich profile below.
      //
      //    First try an exact slug match. If that misses, fall back to a
      //    name-based match (so URLs that were generated from a legacy
      //    user_profiles.username — e.g. /author/jmcguire — still resolve
      //    to the rich managed profile when a managed author has the same
      //    display name).
      let { data: managed } = await supabase
        .from("authors")
        .select("*")
        .eq("slug", username)
        .maybeSingle();

      if (!managed) {
        // Normalize the URL piece: "john-mcguire" or "john_mcguire" → "john mcguire"
        const guessedName = username.replace(/[-_]+/g, " ").trim();
        if (guessedName.length > 0) {
          const { data: candidates } = await supabase
            .from("authors")
            .select("*")
            .ilike("name", guessedName);
          if (candidates && candidates.length > 0) {
            managed =
              candidates.find(
                (c) => c.name.trim().toLowerCase() === guessedName.toLowerCase(),
              ) ?? candidates[0];
          }
        }
      }

      if (managed) {
        setManagedAuthor(managed as AuthorRow);
        setSource("managed");
        // Articles where this author is primary or co-byline,
        // PLUS any legacy article whose `author_name` matches by name
        // (so historic content shows up even if the FK was never written).
        const orFilter = [
          `primary_author_id.eq.${managed.id}`,
          `co_author_id.eq.${managed.id}`,
          `author_name.ilike.%${managed.name}%`,
        ].join(",");
        const { data: rows } = await supabase
          .from("articles")
          .select(ARTICLE_LIST_COLUMNS)
          .eq("status", "published")
          .eq("tenant_id", tenantId)
          .lte("published_at", new Date().toISOString())
          .or(orFilter)
          .order("published_at", { ascending: false });
        setArticles((rows ?? []) as Article[]);
        setLoading(false);
        return;
      }

      // 2. Special-case the AI byline pseudo-author.
      if (username === "diffuse.ai") {
        setLegacyAuthor({
          id: "diffuse-ai",
          full_name: DIFFUSE_AI_BYLINE_DISPLAY,
          username: "diffuse.ai",
          email: "diffuse@ai.com",
          avatar_url: DIFFUSE_AI_AVATAR_PUBLIC_PATH,
          is_admin: false,
          is_super_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserProfile);
        setSource("diffuse");
        const { data: rows } = await supabase
          .from("articles")
          .select(ARTICLE_LIST_COLUMNS)
          .eq("status", "published")
          .or(
            "author_name.ilike.%Powered by diffuse.ai%,author_name.ilike.%diffuse.ai%",
          )
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false });
        setArticles((rows ?? []) as Article[]);
        setLoading(false);
        return;
      }

      // 3. LEGACY FALLBACK — look up a real Supabase user.
      let { data: authorData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (!authorData) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("*")
          .or(`email.ilike.${username}%,full_name.ilike.%${username}%`);
        if (profiles && profiles.length > 0) authorData = profiles[0];
      }

      if (!authorData) {
        const { data: allProfiles } = await supabase
          .from("user_profiles")
          .select("*")
          .in("is_admin", [true])
          .or("is_super_admin.eq.true");
        if (allProfiles) {
          authorData =
            allProfiles.find((profile) => {
              const generatedUsername = profile.email
                ? profile.email
                    .split("@")[0]
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
                : profile.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "");
              return generatedUsername === username;
            }) || null;
        }
      }

      if (authorData) {
        // One final check: if a managed author exists with the same display
        // name as this legacy user_profile, prefer the managed profile so
        // the rich hero (PFP/cover/bio/social) renders instead of the old
        // bare-bones layout. This is the safety net for legacy username
        // URLs that didn't match a managed author's slug above.
        if (authorData.full_name) {
          const { data: matchByName } = await supabase
            .from("authors")
            .select("*")
            .ilike("name", authorData.full_name)
            .limit(1);
          const managedTwin = (matchByName ?? []).find(
            (a) =>
              a.name.trim().toLowerCase() ===
              authorData!.full_name!.trim().toLowerCase(),
          );
          if (managedTwin) {
            setManagedAuthor(managedTwin as AuthorRow);
            setSource("managed");
            const orFilter = [
              `primary_author_id.eq.${managedTwin.id}`,
              `co_author_id.eq.${managedTwin.id}`,
              `author_name.ilike.%${managedTwin.name}%`,
            ].join(",");
            const { data: rows } = await supabase
              .from("articles")
              .select(ARTICLE_LIST_COLUMNS)
              .eq("status", "published")
              .eq("tenant_id", tenantId)
              .lte("published_at", new Date().toISOString())
              .or(orFilter)
              .order("published_at", { ascending: false });
            setArticles((rows ?? []) as Article[]);
            setLoading(false);
            return;
          }
        }

        setLegacyAuthor(authorData);
        setSource("user_profile");
        const { data: rows } = await supabase
          .from("articles")
          .select(ARTICLE_LIST_COLUMNS)
          .eq("status", "published")
          .or(`author_id.eq.${authorData.id},author_name.ilike.%${authorData.full_name}%`)
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false });
        setArticles((rows ?? []) as Article[]);
      }

      setLoading(false);
    }
    void resolveAuthor();
  }, [username, supabase, tenantId]);

  const formattedDate = useMemo(
    () => (dateString: string | null) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
    [],
  );

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[color:var(--color-surface)]">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent" />
              <p className="mt-4 text-[color:var(--color-medium)]">
                Loading author profile…
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!managedAuthor && !legacyAuthor) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[color:var(--color-surface)]">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="mb-4 text-lg text-[color:var(--color-medium)]">
                Author not found.
              </p>
              <Link
                href="/"
                className="inline-block font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main
        className={
          source === "diffuse"
            ? "min-h-screen bg-[#000000]"
            : "min-h-screen bg-[color:var(--color-surface)]"
        }
        style={source === "diffuse" ? { fontFamily: "var(--font-space-grotesk)" } : {}}
      >
        <div className="mx-auto max-w-7xl px-4 py-8">
          {source === "managed" && managedAuthor && (
            <ManagedAuthorHero author={managedAuthor} articleCount={articles.length} />
          )}
          {source === "diffuse" && legacyAuthor && (
            <DiffuseAIHero author={legacyAuthor} articleCount={articles.length} />
          )}
          {source === "user_profile" && legacyAuthor && (
            <LegacyAuthorHero author={legacyAuthor} articleCount={articles.length} />
          )}

          {/* Section header */}
          <div className="mb-6">
            {source === "diffuse" ? (
              <h2
                className="mb-6 border-b-2 border-[#ff9628] pb-3 text-3xl font-bold text-white"
                style={{ letterSpacing: "-0.01em" }}
              >
                Articles published with the help of diffuse.ai
              </h2>
            ) : (
              <h2 className="mb-6 border-b-4 border-[color:var(--color-riviera-blue)] pb-2 text-2xl font-black text-[color:var(--color-dark)]">
                Articles by{" "}
                {source === "managed" ? managedAuthor!.name : legacyAuthor!.full_name}
              </h2>
            )}
          </div>

          {articles.length === 0 ? (
            <div
              className={
                source === "diffuse"
                  ? "rounded-xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl"
                  : "rounded-lg bg-white p-12 text-center"
              }
            >
              <p
                className={
                  source === "diffuse"
                    ? "text-lg text-[#dbdbdb]"
                    : "text-lg text-[color:var(--color-medium)]"
                }
              >
                {source === "managed"
                  ? `${managedAuthor!.name} hasn't published any articles yet.`
                  : "This author hasn't published any articles yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  formattedDate={formattedDate}
                  isDiffuse={source === "diffuse"}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Managed author hero (new, rich layout) ──────────────────────────────

function ManagedAuthorHero({
  author,
  articleCount,
}: {
  author: AuthorRow;
  articleCount: number;
}) {
  const twitter = formatTwitterHandle(author.twitter_handle);
  return (
    <div className="relative mb-6 overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Cover / thumbnail banner */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-[color:var(--color-riviera-blue)] via-[color:var(--color-riviera-blue)]/80 to-[color:var(--color-dark)] sm:h-48">
        {author.cover_image_url && (
          <img
            src={author.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>

      {/* Avatar — absolutely positioned with z-20 so it's GUARANTEED to
          render on top of the cover banner. The thick white border creates
          a clean Twitter-style cutout effect on the body background. */}
      <div className="absolute left-6 top-[5.5rem] z-20 rounded-full border-4 border-white bg-white shadow-xl ring-1 ring-black/5 sm:left-8 sm:top-[7.5rem]">
        <Avatar src={author.avatar_url} name={author.name} size="xl" />
      </div>

      {/* Body — top padding leaves room for the avatar's lower half */}
      <div className="px-6 pt-20 pb-5 sm:px-8 sm:pt-24">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black leading-tight text-[color:var(--color-dark)] sm:text-3xl">
            {author.name}
          </h1>
          {!author.is_active && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Archived
            </span>
          )}
        </div>
        {author.title && (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-riviera-blue)]">
            {author.title}
          </p>
        )}
        <p className="mt-1 text-xs text-[color:var(--color-medium)]">
          {articleCount} article{articleCount === 1 ? "" : "s"} published
        </p>

        {author.bio && (
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-[color:var(--color-dark)]">
            {author.bio}
          </p>
        )}

        {(twitter || author.linkedin_url || author.website_url || author.email) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {twitter && (
              <SocialPill
                href={`https://twitter.com/${twitter}`}
                label={`@${twitter}`}
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18.244 2H21l-6.52 7.45L22 22h-6.78l-4.71-6.16L4.99 22H2.23l6.96-7.95L2 2h6.92l4.27 5.65L18.244 2Zm-1.19 18h1.6L7.04 4H5.35l11.7 16Z" />
                  </svg>
                }
              />
            )}
            {author.linkedin_url && (
              <SocialPill
                href={author.linkedin_url}
                label="LinkedIn"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M19 3A2 2 0 0 1 21 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18V10.27H5.7V18h2.64ZM7.02 9.16a1.53 1.53 0 1 0 0-3.06 1.53 1.53 0 0 0 0 3.06ZM18.3 18v-4.42c0-2.36-1.26-3.46-2.94-3.46-1.36 0-1.97.75-2.31 1.28v-1.1h-2.56c.03.74 0 7.7 0 7.7h2.56v-4.3c0-.23.02-.46.09-.62.18-.46.6-.94 1.31-.94.93 0 1.3.7 1.3 1.74V18h2.55Z" />
                  </svg>
                }
              />
            )}
            {author.website_url && (
              <SocialPill
                href={author.website_url}
                label="Website"
                icon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M3.6 9h16.8 M3.6 15h16.8 M12 3a14 14 0 010 18 M12 3a14 14 0 000 18"
                    />
                  </svg>
                }
              />
            )}
            {author.email && (
              <SocialPill
                href={`mailto:${author.email}`}
                label={author.email}
                icon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SocialPill({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[color:var(--color-dark)] transition hover:border-[color:var(--color-riviera-blue)] hover:text-[color:var(--color-riviera-blue)]"
    >
      <span className="text-[color:var(--color-medium)]">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function formatTwitterHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^@/, "");
  return trimmed.length > 0 ? trimmed : null;
}

// ─── Diffuse AI hero (preserved from previous design) ────────────────────

function DiffuseAIHero({
  author,
  articleCount,
}: {
  author: UserProfile;
  articleCount: number;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8 shadow-[0_20px_25px_-5px_rgba(255,150,40,0.3)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff9628]/10 via-transparent to-[#c086fa]/10 opacity-50" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Avatar src={author.avatar_url} name={author.full_name} size="xl" />
          <div className="flex-1">
            <h1 className="mb-2 text-5xl font-black tracking-tight text-white">
              diffuse<span className="text-[#ff9628]">.ai</span>
            </h1>
            <p className="mb-2 max-w-xl text-xl leading-snug text-[#dbdbdb]">
              Human editors review every story. Articles here are published with help from{" "}
              <span className="font-semibold text-white">diffuse</span>
              <span className="font-semibold text-[#ff9628]">.ai</span>.
            </p>
            <p className="text-[#dbdbdb]">
              {articleCount} article{articleCount === 1 ? "" : "s"} published
            </p>
          </div>
        </div>
        <Link
          href="https://www.diffuse.press"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff9628] to-[#ff7300] px-6 py-3 font-bold text-white transition-all duration-200 hover:scale-105 hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.5)]"
        >
          Visit diffuse.press
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ─── Legacy author hero (user_profiles fallback) ─────────────────────────

function LegacyAuthorHero({
  author,
  articleCount,
}: {
  author: UserProfile;
  articleCount: number;
}) {
  return (
    <div className="mb-8 rounded-lg bg-white p-8 shadow-sm">
      <div className="flex items-center gap-6">
        <Avatar src={author.avatar_url} name={author.full_name} size="xl" />
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-black text-[color:var(--color-dark)]">
                {author.full_name}
              </h1>
              {author.newsletter_subscribed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
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
            {author.username && (
              <p className="mb-1 mt-2 text-lg text-[color:var(--color-medium)]">
                @{author.username}
              </p>
            )}
            <p className="text-[color:var(--color-medium)]">
              {articleCount} article{articleCount === 1 ? "" : "s"} published
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Article card (shared) ───────────────────────────────────────────────

function ArticleCard({
  article,
  formattedDate,
  isDiffuse,
  isAdmin,
}: {
  article: Article;
  formattedDate: (s: string | null) => string;
  isDiffuse: boolean;
  isAdmin: boolean;
}) {
  return (
    <Link href={`/article/${article.slug}`} className="group block">
      {isDiffuse ? (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:border-[#ff9628]/50 hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.3)]">
          {article.image_url ? (
            <div className="relative h-48 flex-shrink-0 overflow-hidden">
              <img
                src={article.image_url}
                alt={article.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="relative flex h-48 flex-shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#ff9628]/20 via-[#141414] to-[#c086fa]/20">
              <svg
                className="h-20 w-20 text-[#ff9628]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
          )}
          <div className="flex flex-1 flex-col p-5">
            <h3
              className="mb-2 line-clamp-2 text-xl font-bold text-white transition group-hover:text-[#ff9628]"
              style={{ letterSpacing: "-0.01em", lineHeight: 1.3 }}
            >
              {article.title}
            </h3>
            {article.excerpt && (
              <p
                className="mb-3 line-clamp-3 flex-1 text-sm text-[#dbdbdb]"
                style={{ lineHeight: 1.6 }}
              >
                {article.excerpt}
              </p>
            )}
            <div className="mt-auto flex items-center gap-2 text-xs text-[#545454]">
              <span>{formattedDate(article.published_at)}</span>
              {isAdmin && (
                <>
                  <span className="text-[#ff9628]">•</span>
                  <span>{article.view_count} views</span>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-md">
          {article.image_url ? (
            <div className="relative h-48 flex-shrink-0 overflow-hidden">
              <img
                src={article.image_url}
                alt={article.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="relative flex h-48 flex-shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-gray-100">
              <svg
                className="h-20 w-20 text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
          )}
          <div className="flex flex-1 flex-col p-5">
            <h3 className="mb-2 line-clamp-2 text-lg font-bold text-[color:var(--color-dark)] transition group-hover:text-blue-600">
              {article.title}
            </h3>
            {article.excerpt && (
              <p className="mb-3 line-clamp-3 flex-1 text-sm text-[color:var(--color-medium)]">
                {article.excerpt}
              </p>
            )}
            <div className="mt-auto text-xs text-[color:var(--color-medium)]">
              {formattedDate(article.published_at)} • {article.view_count} views
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
