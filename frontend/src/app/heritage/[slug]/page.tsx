import type { Metadata } from "next";
import { Suspense } from "react";
import { getHeritageItem, SITE_URL } from "@/lib/server-api";
import { HeritageReader } from "./reader";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getHeritageItem(slug);
  if (!item) return { title: "SANTALIQ Heritage", robots: { index: false } };
  const url = `${SITE_URL}/heritage/${item.slug}`;
  return {
    title: item.title,
    description: item.excerpt,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: item.title, description: item.excerpt },
  };
}

async function Loaded({ params }: Props) {
  const { slug } = await params;
  const item = await getHeritageItem(slug);
  const jsonLd = item && {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: item.title,
    description: item.excerpt,
    inLanguage: "sat",
    contentLocation: item.region ?? undefined,
    contributor: item.contributor
      ? { "@type": "Person", name: item.contributor.display_name, url: `${SITE_URL}/people/${item.contributor.id}` }
      : undefined,
    publisher: { "@type": "Organization", name: "SANTALIQ", url: SITE_URL },
    url: `${SITE_URL}/heritage/${item.slug}`,
  };
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <HeritageReader slug={slug} initial={item} />
    </>
  );
}

export default function HeritageItemPage(props: Props) {
  return (
    <Suspense fallback={<section className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</section>}>
      <Loaded {...props} />
    </Suspense>
  );
}
