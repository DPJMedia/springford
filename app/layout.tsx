import type { Metadata } from "next";
import { Newsreader, Playfair_Display, Red_Hat_Display, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { getSiteConfig, SITE_KEYWORDS } from "@/lib/seo/site";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";
import {
  parseTenantFacebookUrl,
  parseTenantSectionConfig,
} from "@/lib/tenant/parseSectionConfig";
import { TenantProvider } from "@/lib/tenant/TenantProvider";
import "./globals.css";

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-red-hat",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-masthead",
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return { title: "Local News" };
  }
  const { siteUrl, siteName } = getSiteConfig(tenant);
  const desc = `${siteName} — local news and community reporting.`;
  const base = new URL(siteUrl);
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description: desc,
    keywords: SITE_KEYWORDS,
    metadataBase: base,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title: siteName,
      description: desc,
      url: siteUrl,
      siteName,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: desc,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenantRow = await getTenantById(tenantId);
  if (!tenantRow) {
    throw new Error(`Tenant not found for id: ${tenantId}`);
  }

  const tenantContext = {
    id: tenantRow.id,
    name: tenantRow.name,
    slug: tenantRow.slug,
    domain: tenantRow.domain,
    from_email: tenantRow.from_email,
    from_name: tenantRow.from_name,
    section_config: parseTenantSectionConfig(tenantRow),
    facebook_url: parseTenantFacebookUrl(tenantRow),
  };

  return (
    <html lang="en">
      <body
        className={`${redHatDisplay.variable} ${newsreader.variable} ${playfair.variable} ${spaceGrotesk.variable} antialiased bg-[color:var(--color-surface)] text-[color:var(--color-text)]`}
      >
        <TenantProvider value={tenantContext}>
          <OrganizationJsonLd tenant={tenantRow} />
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
