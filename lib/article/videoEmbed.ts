/**
 * Helpers for article video blocks. Two kinds of video are supported:
 *  - "file":    an uploaded video stored in the `article-images` bucket (played via <video>)
 *  - "youtube": a YouTube link — we show the thumbnail and load the embed on click
 */

export type VideoProvider = "file" | "youtube";

const YT_ID = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extract a YouTube video id from any common URL form (watch?v=, youtu.be/,
 * /embed/, /shorts/, /v/) or a bare 11-char id. Returns null when not YouTube.
 */
export function parseYouTubeId(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (YT_ID.test(s)) return s;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && YT_ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v && YT_ID.test(v)) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "v");
    if (idx >= 0 && parts[idx + 1] && YT_ID.test(parts[idx + 1])) {
      return parts[idx + 1];
    }
  }

  return null;
}

export function isYouTubeUrl(input?: string | null): boolean {
  return parseYouTubeId(input) !== null;
}

/** Thumbnail image URL for a YouTube id. hqdefault always exists (unlike maxres). */
export function youTubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Privacy-friendly embed URL. autoplay only after a user click. */
export function youTubeEmbedUrl(id: string, autoplay = true): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
