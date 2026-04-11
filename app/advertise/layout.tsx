import type { Metadata } from "next";
import { getSiteNameFromRequestHeaders } from "@/lib/tenant/metadataFromHeaders";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteNameFromRequestHeaders();
  return {
    title: "Advertise with Us",
    description: siteName
      ? `Reach your local audience through ${siteName}.`
      : "Reach your local audience through our publication.",
  };
}

export default function AdvertiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
