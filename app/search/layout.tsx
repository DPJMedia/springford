import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | Spring-Ford Press",
  description: "Search Spring-Ford Press articles by topic, title, or keywords.",
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
