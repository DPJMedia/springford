import { createClient } from "@/lib/supabase/server";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import { ArticleContent } from "./ArticleContent";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  canReadFullArticleContent,
  normalizeVisibility,
} from "@/lib/articles/visibilityAccess";

const FALLBACK_LOGO_URL = "https://springford.press/springford-press-logo.svg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select(
      "title, meta_title, meta_description, excerpt, image_url, slug, published_at, updated_at"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!article) {
    return {
      title: "Article Not Found | Spring-Ford Press",
      description: "The article you're looking for could not be found.",
    };
  }

  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt || article.title;
  
  // Ensure image URL is absolute
  let imageUrl: string;
  if (article.image_url) {
    if (article.image_url.startsWith('http://') || article.image_url.startsWith('https://')) {
      imageUrl = article.image_url;
    } else if (article.image_url.startsWith('/')) {
      imageUrl = `https://springford.press${article.image_url}`;
    } else {
      imageUrl = `https://springford.press/${article.image_url}`;
    }
  } else {
    imageUrl = `https://springford.press${FALLBACK_LOGO_URL}`;
  }
  
  const articleUrl = `https://springford.press/article/${article.slug}`;
  const publishedTime = article.published_at
    ? new Date(article.published_at).toISOString()
    : undefined;
  const modifiedTime = article.updated_at
    ? new Date(article.updated_at).toISOString()
    : publishedTime;

  return {
    title: `${title} | Spring-Ford Press`,
    description,
    openGraph: {
      title,
      description,
      url: articleUrl,
      siteName: "Spring-Ford Press",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "article",
      publishedTime,
      modifiedTime,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !article) {
    redirect("/");
  }

  const visibility = normalizeVisibility(article.visibility);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let newsletterSubscribed = false;
  let isAdminUser = false;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("newsletter_subscribed, is_admin, is_super_admin")
      .eq("id", user.id)
      .single();
    newsletterSubscribed = profile?.newsletter_subscribed ?? false;
    isAdminUser = !!(profile?.is_admin || profile?.is_super_admin);
  }

  const canReadFull = canReadFullArticleContent(visibility, {
    newsletterSubscribed,
    isAdmin: isAdminUser,
  });

  /** Subscriber-only: show paywall when not subscribed. Subscribers (and full access) get normal body below. */
  const subscriberArticlePaywall =
    visibility === "newsletter_subscribers" && !canReadFull;

  const articleForClient = article;

  return (
    <>
      <ArticleJsonLd article={article} />
      <ArticleContent
        initialArticle={articleForClient}
        slug={slug}
        subscriberArticlePaywall={subscriberArticlePaywall}
      />
    </>
  );
}
