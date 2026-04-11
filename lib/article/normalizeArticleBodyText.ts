/**
 * Prepare stored article body copy for markdown rendering (ReactMarkdown / remark-gfm).
 *
 * - Normalizes CRLF to LF.
 * - Converts literal `\\n` sequences (common when JSON/text was over-escaped) to real newlines
 *   so `\n\n` becomes paragraph breaks instead of visible backslash-n characters.
 * - Collapses runs of 3+ newlines to `\n\n` for predictable paragraph boundaries.
 */
export function normalizeArticleBodyTextForMarkdown(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  let t = String(text);
  t = t.replace(/\r\n/g, "\n");
  if (t.includes("\\n")) {
    t = t.replace(/\\n/g, "\n");
  }
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

/** Normalize text in each content block (admin editor / imports). */
export function normalizeContentBlocksTextForEditor<
  T extends { type: string; content?: string },
>(blocks: T[]): T[] {
  return blocks.map((b) =>
    b.type === "text" && typeof b.content === "string"
      ? ({ ...b, content: normalizeArticleBodyTextForMarkdown(b.content) } as T)
      : b
  );
}
