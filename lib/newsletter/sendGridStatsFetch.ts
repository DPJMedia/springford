/**
 * SendGrid GET /v3/categories/stats returns 404 with
 * `{"errors":[{"message":"category does not exist","field":"categories"}]}`
 * until that category has been used on a processed send — not an application bug.
 */
export function isSendGridCategoryNotYetRegistered(status: number, responseBody: string): boolean {
  if (status !== 404) return false;
  const t = responseBody.toLowerCase();
  if (t.includes("category does not exist")) return true;
  try {
    const j = JSON.parse(responseBody) as { errors?: { message?: string }[] };
    const msg = (j.errors?.[0]?.message ?? "").toLowerCase();
    return msg.includes("category") && (msg.includes("not exist") || msg.includes("does not exist"));
  } catch {
    return false;
  }
}
