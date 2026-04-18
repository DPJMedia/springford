import type { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSiteConfig } from "@/lib/seo/site";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";
import { AboutClient } from "./AboutClient";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenant = await getTenantById(tenantId);
  const siteName = tenant ? getSiteConfig(tenant).siteName : "Local News";
  return {
    title: "About Us",
    description: `Learn about ${siteName} — local reporting, editorial standards, and how we use AI responsibly.`,
  };
}

export default async function AboutPage() {
  const h = await headers();
  const { tenantId } = getTenantFromHeaders(h);
  const tenant = await getTenantById(tenantId);
  const siteName = tenant ? getSiteConfig(tenant).siteName : "this publication";

  return (
    <>
      <Header />
      <AboutClient siteName={siteName} />
      {/* z-index 2 ensures footer renders above the fixed canvas (z-index 1) */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <Footer />
      </div>
    </>
  );
}
