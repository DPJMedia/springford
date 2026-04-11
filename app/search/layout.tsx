import type { Metadata } from "next";
import { getSiteNameFromRequestHeaders } from "@/lib/tenant/metadataFromHeaders";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteNameFromRequestHeaders();
  return {
    title: "Search",
    description: siteName
      ? `Search ${siteName} articles by topic, title, or keywords.`
      : "Search articles by topic, title, or keywords.",
  };
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
