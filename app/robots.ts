import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/seo/site";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenantRow = await getTenantById(tenantId);
  if (!tenantRow) {
    throw new Error(`Tenant not found for robots: ${tenantId}`);
  }
  const { siteUrl } = getSiteConfig(tenantRow);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/login",
          "/signup",
          "/profile",
          "/forgot-password",
          "/reset-password",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
