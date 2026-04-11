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

/** Best-effort title from a parsed JSON object (possibly nested). */
export function pickTitleFromUnknown(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return pickFromRecord(parsed as Record<string, unknown>, [...TITLE_KEYS], 0);
}

/** Best-effort short description / excerpt from parsed JSON. */
export function pickDescriptionFromUnknown(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return pickFromRecord(parsed as Record<string, unknown>, [...DESC_KEYS], 0);
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
    if (c.startsWith("{")) {
      const j = parseJsonIfString(c);
      if (j && typeof j === "object") {
        const t = pickTitleFromUnknown(j);
        if (t) return t;
      }
    }
    const h1 = c.match(/^#\s+([^\n]+)/m);
    if (h1?.[1]?.trim()) return h1[1].trim();
  }

  return null;
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
    if (c.startsWith("{")) {
      const j = parseJsonIfString(c);
      if (j && typeof j === "object") {
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
