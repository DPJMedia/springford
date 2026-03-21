import type { Metadata } from "next";
import { Newsreader, Playfair_Display, Red_Hat_Display, Space_Grotesk } from "next/font/google";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { SITE_KEYWORDS } from "@/lib/seo/site";
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

export const metadata: Metadata = {
  title: "Spring-Ford Press",
  description:
    "Spring-Ford Press – local news for Spring-Ford, Limerick, Royersford, Spring City, Upper Providence, and Montgomery & Chester County, Pennsylvania.",
  keywords: SITE_KEYWORDS,
  metadataBase: new URL("https://www.springford.press"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Spring-Ford Press",
    description:
      "Local news for Spring-Ford, Limerick, Royersford, Upper Providence, and Montgomery & Chester County.",
    url: "https://www.springford.press",
    siteName: "Spring-Ford Press",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spring-Ford Press",
    description:
      "Local news for Spring-Ford, Limerick, Royersford, Upper Providence, and Montgomery & Chester County.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${redHatDisplay.variable} ${newsreader.variable} ${playfair.variable} ${spaceGrotesk.variable} antialiased bg-[color:var(--color-surface)] text-[color:var(--color-text)]`}
      >
        <OrganizationJsonLd />
        {children}
      </body>
    </html>
  );
}
