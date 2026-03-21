/**
 * Shared display helpers for avatars and profile UI.
 */

/** Rejects literal "undefined"/"null" strings and empty values so <img src> never breaks. */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const s = String(url).trim();
  if (s === "" || s === "undefined" || s === "null") return null;
  return s;
}

/**
 * Two-letter initials: first word + last word when possible; otherwise two chars from first word or one char / email.
 */
export function getAvatarInitials(
  name: string | null | undefined,
  email: string | null | undefined,
  options?: { isDiffuseAI?: boolean }
): string {
  if (options?.isDiffuseAI) return "AI";

  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
  }
  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }
  return "?";
}

export function isDiffuseAIUser(
  name: string | null | undefined,
  email: string | null | undefined
): boolean {
  return (
    name?.toLowerCase().includes("diffuse.ai") === true ||
    name?.toLowerCase().includes("powered by diffuse") === true ||
    email?.toLowerCase().includes("diffuse") === true
  );
}
