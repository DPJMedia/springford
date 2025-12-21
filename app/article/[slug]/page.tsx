import { createClient } from "@/lib/supabase/server";
import { ArticleContent } from "./ArticleContent";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

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
    .select("title, meta_title, meta_description, excerpt, image_url, slug")
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

  return <ArticleContent initialArticle={article} slug={slug} />;
}
