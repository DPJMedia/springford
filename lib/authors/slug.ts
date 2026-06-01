/**
 * Convert an author name to a URL-friendly slug.
 * "John McGuire" → "john-mcguire"
 */
export function slugifyAuthorName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
