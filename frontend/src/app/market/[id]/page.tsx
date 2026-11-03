import type { Metadata } from "next";
import { Suspense } from "react";
import { getListing, SITE_URL } from "@/lib/server-api";
import { ProductPage } from "./product-page";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const x = await getListing(id);
  if (!x || x.section !== "market") return { title: "SANTALIQ Market", robots: { index: false } };
  const url = `${SITE_URL}/market/${x.id}`;
  return {
    title: x.title,
    description: x.description.slice(0, 200),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: x.title,
      description: x.description.slice(0, 200),
      images: x.image_url ? [{ url: `${SITE_URL}${x.image_url}` }] : undefined,
    },
  };
}

async function Loaded({ params }: Props) {
  const { id } = await params;
  const x = await getListing(id);
  const jsonLd = x &&
    x.section === "market" && {
      "@context": "https://schema.org",
      "@type": "Product",
      name: x.title,
      description: x.description.slice(0, 500),
      image: x.image_urls.map((u) => `${SITE_URL}${u}`),
      category: x.category,
      ...(x.price_amount != null && x.currency
        ? {
            offers: {
              "@type": "Offer",
              price: x.price_amount,
              priceCurrency: x.currency,
              availability: x.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              url: `${SITE_URL}/market/${x.id}`,
              seller: x.posted_by ? { "@type": "Person", name: x.posted_by } : undefined,
            },
          }
        : {}),
    };
  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <ProductPage id={id} initial={x} />
    </>
  );
}

export default function MarketProductPage(props: Props) {
  return (
    <Suspense fallback={<section className="mx-auto max-w-6xl px-4 py-16 text-muted">…</section>}>
      <Loaded {...props} />
    </Suspense>
  );
}
