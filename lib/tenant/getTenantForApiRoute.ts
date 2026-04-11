import { headers } from "next/headers";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";
import type { TenantRow } from "@/lib/types/database";

/** Route Handlers / server code: tenant from incoming request headers. */
export async function getTenantForApiRoute(): Promise<TenantRow> {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant not found for id: ${tenantId}`);
  }
  return tenant;
}
