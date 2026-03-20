import type { ArticleVisibility } from "@/lib/types/database";

export function normalizeVisibility(v: unknown): ArticleVisibility {
  if (v === "newsletter_subscribers" || v === "admin_only") return v;
  return "public";
}

export function canReadFullArticleContent(
  visibility: ArticleVisibility,
  opts: { newsletterSubscribed: boolean; isAdmin: boolean }
): boolean {
  if (visibility === "public") return true;
  if (visibility === "newsletter_subscribers") return opts.newsletterSubscribed;
  if (visibility === "admin_only") return opts.isAdmin;
  return true;
}
