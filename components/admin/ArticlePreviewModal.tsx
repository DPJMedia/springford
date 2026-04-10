"use client";

import { Fragment } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ContentBlock } from "@/components/BlockEditor";

/** Same markdown component map as `app/article/[slug]/ArticleContent.tsx` (reader view). */
const markdownComponents = {
  a: ({ ...props }: React.ComponentProps<"a">) => (
    <a
      {...props}
      className="text-blue-600 hover:text-blue-800 underline font-normal"
      target={props.href?.startsWith("http") ? "_blank" : undefined}
      rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
    />
  ),
  strong: ({ ...props }: React.ComponentProps<"strong">) => (
    <strong {...props} className="font-bold" style={{ fontWeight: 700 }} />
  ),
  em: ({ ...props }: React.ComponentProps<"em">) => (
    <em {...props} className="italic" style={{ fontStyle: "italic" }} />
  ),
  p: ({ ...props }: React.ComponentProps<"p">) => (
    <p {...props} className="mb-4 leading-relaxed" />
  ),
  ul: ({ ...props }: React.ComponentProps<"ul">) => (
    <ul
      {...props}
      className="markdown-list markdown-list-ul"
      style={{ listStyleType: "disc", paddingLeft: "1.5rem", marginLeft: "1.5rem" }}
    />
  ),
  ol: ({ ...props }: React.ComponentProps<"ol">) => (
    <ol
      {...props}
      className="markdown-list markdown-list-ol"
      style={{ listStyleType: "decimal", paddingLeft: "1.5rem", marginLeft: "1.5rem" }}
    />
  ),
  li: ({ ...props }: React.ComponentProps<"li">) => (
    <li {...props} className="markdown-list-item" style={{ marginBottom: "0.5rem" }} />
  ),
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  excerpt: string;
  contentBlocks: ContentBlock[];
  legacyContent?: string;
  imageUrl: string | null;
  imageCaption: string;
  imageCredit: string;
  authorName: string;
};

export function ArticlePreviewModal({
  open,
  onClose,
  title,
  subtitle,
  excerpt,
  contentBlocks,
  legacyContent = "",
  imageUrl,
  imageCaption,
  imageCredit,
  authorName,
}: Props) {
  if (!open) return null;

  const sorted = [...contentBlocks].sort((a, b) => a.order - b.order);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Public site tokens: same surface + text as article page (ArticleContent) */}
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-[color:var(--color-surface)] px-4 py-3">
          <h2
            id="article-preview-title"
            className="text-sm font-semibold text-[color:var(--color-medium)]"
          >
            Preview (as on the live site — no ads)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[color:var(--color-medium)] transition-colors hover:bg-gray-100 hover:text-[color:var(--color-riviera-blue)]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[color:var(--color-surface)] px-6 py-8">
          <article className="mx-auto max-w-2xl text-[color:var(--color-dark)]">
            <header className="mb-8">
              <h1 className="text-4xl font-black leading-tight text-[color:var(--color-dark)] md:text-5xl">
                {title || "Untitled"}
              </h1>
              {subtitle ? (
                <h2 className="mt-4 text-xl text-[color:var(--color-medium)] md:text-2xl">
                  {subtitle}
                </h2>
              ) : null}
              {excerpt ? (
                <p className="mt-4 border-l-4 border-[color:var(--color-riviera-blue)] pl-4 text-lg italic text-[color:var(--color-medium)]">
                  {excerpt}
                </p>
              ) : null}
              <div className="mt-6 border-t border-gray-200 pt-4 text-sm text-[color:var(--color-medium)]">
                By <span className="font-semibold text-[color:var(--color-dark)]">{authorName || "Author"}</span>
              </div>
            </header>

            {imageUrl ? (
              <figure className="mb-8">
                <img src={imageUrl} alt={title || "Featured"} className="h-auto w-full rounded-lg shadow-lg" />
                {(imageCaption || imageCredit) && (
                  <figcaption className="mt-2 text-sm italic text-[color:var(--color-medium)]">
                    {imageCaption}
                    {imageCredit ? ` Photo: ${imageCredit}` : ""}
                  </figcaption>
                )}
              </figure>
            ) : null}

            <div className="prose prose-lg max-w-none text-[color:var(--color-dark)]">
              {sorted.length > 0 ? (
                sorted.map((block) => (
                  <Fragment key={block.id}>
                    {block.type === "text" ? (
                      <div className="article-text-block markdown-content mb-6 text-lg leading-relaxed text-[color:var(--color-dark)]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {block.content || ""}
                        </ReactMarkdown>
                      </div>
                    ) : block.type === "image" && block.url ? (
                      <figure className="my-8">
                        <img
                          src={block.url}
                          alt={block.caption || "Article image"}
                          className="w-full rounded-lg shadow-lg"
                        />
                        {(block.caption || block.credit) && (
                          <figcaption className="mt-3 text-sm italic text-[color:var(--color-medium)]">
                            {block.caption}
                            {block.credit ? ` - Photo: ${block.credit}` : ""}
                          </figcaption>
                        )}
                      </figure>
                    ) : null}
                  </Fragment>
                ))
              ) : (
                <div className="markdown-content mb-8 text-lg leading-relaxed text-[color:var(--color-dark)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {legacyContent || "_No content yet._"}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
