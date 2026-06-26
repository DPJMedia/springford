import { headers } from "next/headers";
import {
  getTenantById,
  fetchTenantByDomain,
  fetchTenantBySlug,
} from "@/lib/tenant/getTenant";
import type { TenantRow } from "@/lib/types/database";

/**
 * Resolve the current tenant inside a route handler that has no page params.
 * Prefers the x-tenant-id header set by middleware, then falls back to the
 * request host, then the spring-ford default (localhost / preview hosts).
 */
export async function resolveTenantFromHeaders(): Promise<TenantRow | null> {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  if (tenantId) {
    const t = await getTenantById(tenantId);
    if (t) return t;
  }
  const host = h.get("host") || "";
  const byDomain = host ? await fetchTenantByDomain(host) : null;
  if (byDomain) return byDomain;
  return fetchTenantBySlug(process.env.NEXT_PUBLIC_LOCAL_TENANT_SLUG?.trim() || "spring-ford");
}
