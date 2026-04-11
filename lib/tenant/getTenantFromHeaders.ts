/**
 * Reads tenant context set by middleware. Throws if headers are missing — every
 * server request should pass through middleware with x-tenant-id / x-tenant-slug.
 */
export function getTenantFromHeaders(headers: {
  get(name: string): string | null;
}): { tenantId: string; tenantSlug: string } {
  const tenantId = headers.get("x-tenant-id");
  const tenantSlug = headers.get("x-tenant-slug");
  if (!tenantId || !tenantSlug) {
    throw new Error(
      "Missing tenant context headers (x-tenant-id / x-tenant-slug). Ensure middleware ran for this route."
    );
  }
  return { tenantId, tenantSlug };
}
