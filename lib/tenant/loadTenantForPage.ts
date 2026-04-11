import { headers } from "next/headers";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";
import type { TenantRow } from "@/lib/types/database";

/** Server Components: resolve current tenant from middleware headers (service role). */
export async function loadTenantForPage(): Promise<TenantRow> {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant not found for id: ${tenantId}`);
  }
  return tenant;
}
