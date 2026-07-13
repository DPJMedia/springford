import type { Metadata } from "next";
import { getSiteNameFromRequestHeaders } from "@/lib/tenant/metadataFromHeaders";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteNameFromRequestHeaders();
  return {
    title: "Community Calendar",
    description: siteName
      ? `Local events and news happening around ${siteName}, organized by day.`
      : "Local events and news, organized by day.",
  };
}

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
