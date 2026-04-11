import type { TenantRow } from "@/lib/types/database";
import { getSiteConfig, SITE_NAME } from "@/lib/seo/site";

/** Site name + canonical URL + default From for transactional SendGrid emails (per tenant). */
export type TransactionalEmailBranding = {
  siteUrl: string;
  siteName: string;
  from_email: string;
  from_name: string;
};

export function transactionalEmailBrandingFromTenant(
  tenant: TenantRow,
): TransactionalEmailBranding {
  const { siteUrl, siteName } = getSiteConfig(tenant);
  const from_email =
    tenant.from_email?.trim() || "admin@dpjmedia.com";
  const from_name = tenant.from_name?.trim() || siteName;
  return { siteUrl, siteName, from_email, from_name };
}

/** Legacy tokens / previews when tenant is not available. */
export function fallbackTransactionalEmailBranding(): TransactionalEmailBranding {
  const raw =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
    "https://www.springford.press";
  const siteUrl = String(raw).replace(/\/$/, "");
  return {
    siteUrl,
    siteName: SITE_NAME,
    from_email: "admin@dpjmedia.com",
    from_name: SITE_NAME,
  };
}

/** Client-side: build transactional branding from `TenantProvider` context (admin previews). */
export function transactionalEmailBrandingFromTenantContext(ctx: {
  name: string;
  domain: string;
  from_email: string;
  from_name: string;
}): TransactionalEmailBranding {
  const domain = ctx.domain.trim().toLowerCase();
  const siteUrl = `https://www.${domain}`;
  const siteName = ctx.name.trim();
  const from_email = ctx.from_email?.trim() || "admin@dpjmedia.com";
  const from_name = ctx.from_name?.trim() || siteName;
  return { siteUrl, siteName, from_email, from_name };
}
