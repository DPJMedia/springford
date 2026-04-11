"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { normalizeArticleBodyTextForMarkdown } from "@/lib/article/normalizeArticleBodyText";
import remarkGfm from "remark-gfm";
import { Fragment } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { ContentBlock } from "@/lib/types/database";
import { useTenant } from "@/lib/tenant/TenantProvider";

/** Match main article markdown so background layout ≈ the real article */
const blurMarkdownComponents = {
  a: ({ children }: { children?: ReactNode }) => (
    <span className="text-[color:var(--color-dark)]">{children}</span>
  ),
  p: ({ ...props }: ComponentProps<"p">) => (
    <p {...props} className="mb-4 leading-relaxed" />
  ),
  strong: ({ ...props }: ComponentProps<"strong">) => (
    <strong {...props} className="font-bold" style={{ fontWeight: 700 }} />
  ),
  em: ({ ...props }: ComponentProps<"em">) => (
    <em {...props} className="italic" style={{ fontStyle: "italic" }} />
  ),
  ul: ({ ...props }: ComponentProps<"ul">) => (
    <ul
      {...props}
      className="markdown-list markdown-list-ul mb-4"
      style={{ listStyleType: "disc", paddingLeft: "1.5rem", marginLeft: "1.5rem" }}
    />
  ),
  ol: ({ ...props }: ComponentProps<"ol">) => (
    <ol
      {...props}
      className="markdown-list markdown-list-ol mb-4"
      style={{ listStyleType: "decimal", paddingLeft: "1.5rem", marginLeft: "1.5rem" }}
    />
  ),
  li: ({ ...props }: ComponentProps<"li">) => (
    <li {...props} className="markdown-list-item" style={{ marginBottom: "0.5rem" }} />
  ),
  h1: ({ ...props }: ComponentProps<"h1">) => (
    <h1 {...props} className="mb-4 text-2xl font-bold" />
  ),
  h2: ({ ...props }: ComponentProps<"h2">) => (
    <h2 {...props} className="mb-3 text-xl font-bold" />
  ),
  h3: ({ ...props }: ComponentProps<"h3">) => (
    <h3 {...props} className="mb-4 text-lg font-bold" />
  ),
  blockquote: ({ ...props }: ComponentProps<"blockquote">) => (
    <blockquote {...props} className="mb-4 border-l-4 border-slate-300 pl-4 italic" />
  ),
  hr: ({ ...props }: ComponentProps<"hr">) => (
    <hr {...props} className="my-8 border-slate-300" />
  ),
  code: ({ ...props }: ComponentProps<"code">) => (
    <code {...props} className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[0.9em]" />
  ),
};

type Props = {
  content: string | null;
  contentBlocks: ContentBlock[] | null | undefined;
};

function BlurredArticleBody({
  content,
  contentBlocks,
}: {
  content: string | null;
  contentBlocks: ContentBlock[] | null | undefined;
}) {
  const hasBlocks = Array.isArray(contentBlocks) && contentBlocks.length > 0;
  const legacyBody = (content || "").trim();

  return (
    <div className="prose prose-lg max-w-none text-[color:var(--color-dark)]">
      {hasBlocks ? (
        [...(contentBlocks ?? [])]
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <Fragment key={block.id}>
              {block.type === "text" ? (
                <div className="article-text-block markdown-content mb-6 text-lg leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={blurMarkdownComponents}
                  >
                    {normalizeArticleBodyTextForMarkdown(block.content)}
                  </ReactMarkdown>
                </div>
              ) : block.type === "image" && block.url ? (
                <figure className="my-8">
                  <img src={block.url} alt="" className="w-full rounded-lg" />
                  {(block.caption || block.credit) && (
                    <figcaption className="mt-2 text-sm italic text-[color:var(--color-medium)]">
                      {block.caption}
                      {block.credit && ` — ${block.credit}`}
                    </figcaption>
                  )}
                </figure>
              ) : (
                /* future block types: keep layout in one flow */
                null
              )}
            </Fragment>
          ))
      ) : legacyBody ? (
        <div className="markdown-content text-lg leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={blurMarkdownComponents}>
            {normalizeArticleBodyTextForMarkdown(legacyBody)}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-slate-400">No article body to preview.</p>
      )}
    </div>
  );
}

/**
 * One card: real article is the background (lightly blurred so it reads as text).
 * Frosted gradient + copy on top. “Not a subscriber?” sits above the limited-time offer.
 */
export function SubscriberArticlePaywall({ content, contentBlocks }: Props) {
  const { name: siteName } = useTenant();
  return (
    <div className="relative my-8 min-h-[min(70vh,640px)] overflow-hidden rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)]">
      {/* Background: full article — light blur so words still read as text */}
      <div className="relative z-0 px-8 pb-12 pt-8 sm:px-12 sm:pb-16 sm:pt-10">
        <div
          className="pointer-events-none select-none opacity-[0.72] [filter:blur(5px)] sm:[filter:blur(6px)]"
          aria-hidden
        >
          <BlurredArticleBody content={content} contentBlocks={contentBlocks} />
        </div>
      </div>

      {/* Foreground: single frosted layer over the same box — offer on top */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col bg-gradient-to-b from-white/92 from-[0%] via-white/55 via-[38%] to-white/5 to-[100%]">
        <div className="pointer-events-auto mx-auto w-full max-w-lg px-6 pb-10 pt-10 text-center sm:px-8 sm:pt-12">
          <h2 className="text-2xl font-black tracking-tight text-[color:var(--color-dark)] sm:text-3xl">
            Not a subscriber?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-medium)]">
            The full story is behind this panel—subscribe to read it clearly.
          </p>

          <p className="mb-2 mt-10 text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-riviera-blue)]">
            Limited time
          </p>
          <h3 className="text-xl font-semibold tracking-tight text-[color:var(--color-dark)] sm:text-2xl">
            {siteName}
            <br />
            <span className="text-[color:var(--color-riviera-blue)]">Grand Opening Offer</span>
          </h3>
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-emerald-100/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-900 shadow-sm">
              First 500 subscribers — free for a year
            </span>
          </div>
          <p className="mt-3 text-sm text-[color:var(--color-medium)]">No payment method required</p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[color:var(--color-medium)]">
            Our way of giving back to the community and keeping our earliest subscribers well informed.
          </p>

          <Link
            href="/subscribe"
            className="mt-8 inline-flex min-w-[200px] items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
          >
            Subscribe now
          </Link>
          <p className="mt-4 text-xs text-[color:var(--color-medium)]">
            Already have an account?{" "}
            <Link
              href="/login?returnTo=/subscribe"
              className="font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
