import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Ol_Chiki,
  Noto_Sans_Oriya,
} from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const olChiki = Noto_Sans_Ol_Chiki({ variable: "--font-olchiki", subsets: ["ol-chiki"] });
const bengali = Noto_Sans_Bengali({ variable: "--font-bengali", subsets: ["bengali"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"] });
const oriya = Noto_Sans_Oriya({ variable: "--font-oriya", subsets: ["oriya"] });

export const metadata: Metadata = {
  title: {
    default: "SANTALIQ — Santali Language. AI Innovation.",
    template: "%s · SANTALIQ",
  },
  description:
    "A digital home for the Santali language, people and culture — dictionary, script tools, grounded AI, voice, learning, heritage and community.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [inter, fraunces, olChiki, bengali, devanagari, oriya]
    .map((f) => f.variable)
    .join(" ");

  return (
    <html lang="en" className={`${fonts} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
