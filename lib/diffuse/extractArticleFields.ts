import type { DiffuseOutput } from "./client";

const TITLE_KEYS = [
  "title",
  "name",
  "headline",
  "article_title",
  "subject",
  "story_title",
  "heading",
  "page_title",
] as const;

const DESC_KEYS = [
  "excerpt",
  "description",
  "subtitle",
  "summary",
  "deck",
  "lede",
  "dek",
] as const;

const NEST_KEYS = [
  "article",
  "metadata",
  "data",
  "fields",
  "output",
  "properties",
  "result",
  "story",
  "content",
] as const;

const BODY_KEYS = [
  "content",
  "body",
  "markdown",
  "markdown_body",
  "html",
  "text",
  "full_text",
  "article_html",
  "copy",
  "story",
] as const;

/** Nesting paths for body text (omit generic "content" to avoid wrong object walks). */
const NEST_FOR_BODY = [
  "article",
  "story",
  "data",
  "output",
  "result",
  "metadata",
  "fields",
  "items",
  "response",
] as const;

function pickFromRecord(
  obj: Record<string, unknown>,
  keys: readonly string[],
  depth: number,
): string | null {
  if (depth > 8) return null;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const nk of NEST_KEYS) {
    const child = obj[nk];
    if (child && typeof child === "object" && !Array.isArray(child)) {
      const t = pickFromRecord(child as Record<string, unknown>, keys, depth + 1);
      if (t) return t;
    }
  }
  return null;
}

function pickBodyFromRecord(obj: Record<string, unknown>, depth: number): string | null {
  if (depth > 8) return null;
  for (const key of BODY_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const nk of NEST_FOR_BODY) {
    const child = obj[nk];
    if (child && typeof child === "object" && !Array.isArray(child)) {
      const b = pickBodyFromRecord(child as Record<string, unknown>, depth + 1);
      if (b) return b;
    }
  }
  return null;
}

/** Best-effort title from a parsed JSON object (possibly nested) or array of articles. */
export function pickTitleFromUnknown(parsed: unknown): string | null {
  if (parsed == null) return null;
  if (Array.isArray(parsed)) {
    for (const el of parsed) {
      const t = pickTitleFromUnknown(el);
      if (t) return t;
    }
    return null;
  }
  if (typeof parsed !== "object") return null;
  return pickFromRecord(parsed as Record<string, unknown>, [...TITLE_KEYS], 0);
}

/** Best-effort short description / excerpt from parsed JSON. */
export function pickDescriptionFromUnknown(parsed: unknown): string | null {
  if (parsed == null) return null;
  if (Array.isArray(parsed)) {
    for (const el of parsed) {
      const d = pickDescriptionFromUnknown(el);
      if (d) return d;
    }
    return null;
  }
  if (typeof parsed !== "object") return null;
  return pickFromRecord(parsed as Record<string, unknown>, [...DESC_KEYS], 0);
}

/**
 * Article body from Diffuse JSON (often `article.content` while `structured_data` is empty).
 * Handles top-level strings, `{ article: { content } }`, and `[{ article: {...} }]`.
 */
export function pickBodyFromUnknown(parsed: unknown): string | null {
  if (parsed == null) return null;
  if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
  if (Array.isArray(parsed)) {
    for (const el of parsed) {
      const b = pickBodyFromUnknown(el);
      if (b) return b;
    }
    return null;
  }
  if (typeof parsed === "object") {
    return pickBodyFromRecord(parsed as Record<string, unknown>, 0);
  }
  return null;
}

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Resolve a human-readable title from a Diffuse output (structured_data, workflow_metadata,
 * JSON content, markdown H1, etc.). Used by admin Diffuse UI and import.
 */
export function extractTitleFromDiffuseOutput(output: DiffuseOutput | undefined): string | null {
  if (!output) return null;

  let parsed: unknown = output.structured_data;
  parsed = parseJsonIfString(parsed) ?? parsed;
  if (parsed && typeof parsed === "object") {
    const t = pickTitleFromUnknown(parsed);
    if (t) return t;
  }

  const wm = parseJsonIfString(output.workflow_metadata) ?? output.workflow_metadata;
  if (wm && typeof wm === "object" && !Array.isArray(wm)) {
    const t = pickTitleFromUnknown(wm);
    if (t) return t;
  }

  if (output.content && typeof output.content === "string") {
    const c = output.content.trim();
    if (c.startsWith("{") || c.startsWith("[")) {
      const j = parseJsonIfString(c);
      if (j != null) {
        const t = pickTitleFromUnknown(j);
        if (t) return t;
      }
    }
    const h1 = c.match(/^#\s+([^\n]+)/m);
    if (h1?.[1]?.trim()) return h1[1].trim();
  }

  return null;
}

/** Full article body for editor: same sources as title, prefers nested `article.content`. */
export function extractBodyTextFromDiffuseOutput(output: DiffuseOutput | undefined): string | null {
  if (!output?.content || typeof output.content !== "string") return null;
  const c = output.content.trim();
  if (!c) return null;
  if (c.startsWith("{") || c.startsWith("[")) {
    const j = parseJsonIfString(c);
    if (j != null) {
      const b = pickBodyFromUnknown(j);
      if (b) return b;
    }
  }
  return c;
}

export function extractDescriptionFromDiffuseOutput(output: DiffuseOutput | undefined): string | null {
  if (!output) return null;

  let parsed: unknown = output.structured_data;
  parsed = parseJsonIfString(parsed) ?? parsed;
  if (parsed && typeof parsed === "object") {
    const d = pickDescriptionFromUnknown(parsed);
    if (d) return d;
  }

  const wm = parseJsonIfString(output.workflow_metadata) ?? output.workflow_metadata;
  if (wm && typeof wm === "object" && !Array.isArray(wm)) {
    const d = pickDescriptionFromUnknown(wm);
    if (d) return d;
  }

  if (output.content && typeof output.content === "string") {
    const c = output.content.trim();
    if (c.startsWith("{") || c.startsWith("[")) {
      const j = parseJsonIfString(c);
      if (j != null) {
        const d = pickDescriptionFromUnknown(j);
        if (d) return d;
      }
    }
    if (!c.startsWith("{") && c.length > 0) {
      return c.length > 200 ? `${c.slice(0, 197)}...` : c;
    }
  }

  return null;
}
