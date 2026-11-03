import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublishedPost, SITE_URL } from "@/lib/server-api";
import { ReadPost } from "./reader";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "SANTALIQ Write", robots: { index: false } };
  const url = `${SITE_URL}/write/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    authors: [{ name: post.author.display_name, url: `${SITE_URL}/people/${post.author.id}` }],
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? undefined,
      authors: [post.author.display_name],
    },
  };
}

/** Published pieces are rendered on the server (for search engines and slow networks);
 * drafts and moderator views are loaded in the browser with the session cookie. */
async function Loaded({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  const jsonLd = post && {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author.display_name, url: `${SITE_URL}/people/${post.author.id}` },
    publisher: { "@type": "Organization", name: "SANTALIQ", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/write/${post.slug}`,
  };
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify output with "<" escaped cannot break out of the script tag
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <ReadPost slug={slug} initial={post} />
    </>
  );
}

export default function ReadPostPage(props: Props) {
  return (
    <Suspense fallback={<section className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</section>}>
      <Loaded {...props} />
    </Suspense>
  );
}
