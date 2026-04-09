/**
 * Human-readable message for thrown/caught values (Supabase PostgREST errors are
 * often plain objects, so String(err) becomes "[object Object]").
 */
export function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.error_description === "string") return o.error_description;
    if (typeof o.hint === "string" && typeof o.code === "string") {
      return `${o.code}: ${o.hint}`;
    }
    try {
      return JSON.stringify(err);
    } catch {
      /* fall through */
    }
  }
  return String(err);
}
