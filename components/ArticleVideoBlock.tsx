"use client";

import { useState } from "react";
import {
  parseYouTubeId,
  youTubeThumbnail,
  youTubeEmbedUrl,
  type VideoProvider,
} from "@/lib/article/videoEmbed";

type ArticleVideoBlockProps = {
  url?: string;
  provider?: VideoProvider;
  caption?: string;
  credit?: string;
};

/**
 * Renders a video content block at the SAME width as article images
 * (`w-full rounded-lg shadow-lg`). YouTube links show the thumbnail first and
 * only load the (privacy-friendly) embed once the reader clicks play.
 */
export function ArticleVideoBlock({ url, provider, caption, credit }: ArticleVideoBlockProps) {
  const [playing, setPlaying] = useState(false);
  const ytId = parseYouTubeId(url);
  const isYouTube = provider === "youtube" || (!provider && !!ytId);

  if (!url) return null;

  return (
    <figure className="my-8">
      {isYouTube && ytId ? (
        <div className="relative w-full aspect-video overflow-hidden rounded-lg shadow-lg bg-black">
          {playing ? (
            <iframe
              src={youTubeEmbedUrl(ytId)}
              title={caption || "Video"}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 h-full w-full cursor-pointer"
              aria-label="Play video"
            >
              <img
                src={youTubeThumbnail(ytId)}
                alt={caption || "Video thumbnail"}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 transition group-hover:bg-red-600">
                  <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </button>
          )}
        </div>
      ) : (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full rounded-lg shadow-lg bg-black"
        />
      )}
      {(caption || credit) && (
        <figcaption className="mt-2 text-sm text-[color:var(--color-medium)] italic">
          {caption}
          {credit && ` — ${credit}`}
        </figcaption>
      )}
    </figure>
  );
}
