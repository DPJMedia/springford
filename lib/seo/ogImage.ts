/**
 * Open Graph image helper.
 *
 * Source photos uploaded to article-images storage can be 2–5 MB+ camera shots
 * at native resolution (e.g. 2856×2142). Facebook's link-preview crawler
 * (`facebookexternalhit`) often refuses to render such images — it has tight
 * timeouts and aspect-ratio sanity checks — and caches the "no image" result
 * for ~24 h, which is why some article shares come through with the headline
 * but no thumbnail.
 *
 * To prevent that, every OG image URL is routed through Supabase Storage's
 * built-in image transformation endpoint, which returns a properly-sized
 * 1200×630 JPEG at ~150–250 KB. That:
 *   - matches the dimensions we declare in og:image:width / og:image:height
 *   - is well under Facebook's recommended size budget
 *   - is cached by Supabase + Cloudflare, so repeat scrapes are fast
 *
 * Non-Supabase URLs (or URLs that are already routed through the render
 * endpoint) pass through unchanged.
 */

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
const OG_IMAGE_QUALITY = 80;

const STORAGE_OBJECT_PATH = "/storage/v1/object/public/";
const STORAGE_RENDER_PATH = "/storage/v1/render/image/public/";

/**
 * Convert a Supabase Storage public image URL into a server-rendered, resized
 * variant suitable for social link previews (Facebook, Twitter, LinkedIn, etc.).
 * Returns null for empty input. Non-transformable URLs are returned unchanged.
 */
export function getOptimizedOgImageUrl(
  rawUrl: string | null | undefined,
): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Already a render URL — leave it alone.
  if (trimmed.includes(STORAGE_RENDER_PATH)) return trimmed;

  // Only Supabase storage public URLs are transformable.
  if (!trimmed.includes(STORAGE_OBJECT_PATH)) return trimmed;

  const transformed = trimmed.replace(STORAGE_OBJECT_PATH, STORAGE_RENDER_PATH);
  const separator = transformed.includes("?") ? "&" : "?";

  return `${transformed}${separator}width=${OG_IMAGE_WIDTH}&height=${OG_IMAGE_HEIGHT}&resize=cover&quality=${OG_IMAGE_QUALITY}`;
}
