import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advertise with Us | Spring-Ford Press",
  description: "Reach your local audience through Spring-Ford Press. Advertising opportunities for Spring City, Royersford, Limerick, and Upper Providence.",
};

export default function AdvertiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
