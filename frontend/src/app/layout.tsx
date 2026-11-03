import type { Metadata, Viewport } from "next";
import {
  Inter,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Ol_Chiki,
  Noto_Sans_Oriya,
} from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { themeInitScript } from "@/components/theme-toggle";
import { ErrorReporter } from "@/components/error-reporter";
import { I18nRoot } from "@/lib/i18n";
import { localeInitScript } from "@/lib/i18n/init";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const olChiki = Noto_Sans_Ol_Chiki({ variable: "--font-olchiki", subsets: ["ol-chiki"] });
const bengali = Noto_Sans_Bengali({ variable: "--font-bengali", subsets: ["bengali"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"] });
const oriya = Noto_Sans_Oriya({ variable: "--font-oriya", subsets: ["oriya"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://santaliq.supersoftltd.com"),
  title: {
    default: "SANTALIQ — Santali Language. AI Innovation.",
    template: "%s · SANTALIQ",
  },
  description:
    "A digital home for the Santali language, people and culture — translator, script tools, dictionary, AI, voice, learning, heritage and community.",
  openGraph: {
    title: "SANTALIQ — Santali Language. AI Innovation.",
    description: "A digital home for the Santali language, people and culture.",
    siteName: "SANTALIQ",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#071b2b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [inter, olChiki, bengali, devanagari, oriya].map((f) => f.variable).join(" ");

  return (
    <html lang="en" className={`${fonts} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <ErrorReporter />
        <SiteHeader />
        <main id="main" className="flex-1">
          <I18nRoot>{children}</I18nRoot>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
