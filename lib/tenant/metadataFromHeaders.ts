import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/seo/site";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";

/** Resolve current tenant site name for nested `generateMetadata` (title template + descriptions). */
export async function getSiteNameFromRequestHeaders(): Promise<string | null> {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  return getSiteConfig(tenant).siteName;
}
