import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert, Card } from "@/components/ui";
import { getAuthorPosts, getProfile, SITE_URL } from "@/lib/server-api";
import { KIND_LABEL } from "@/lib/write";

import { Tr } from "@/lib/i18n";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getProfile(id);
  if (!p) return { title: "Member", robots: { index: false } };
  const description = p.bio ?? `${p.display_name} on SANTALIQ — Santali writing and language contributions.`;
  return {
    title: p.display_name,
    description,
    alternates: { canonical: `${SITE_URL}/people/${p.id}` },
    openGraph: { type: "profile", title: p.display_name, description, url: `${SITE_URL}/people/${p.id}` },
  };
}

function isoDate(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

async function ProfileView({ params }: Props) {
  const { id } = await params;
  const [p, posts] = await Promise.all([getProfile(id), getAuthorPosts(id)]);
  if (!p)
    return (
      <div className="space-y-6">
        <Alert><Tr s={"This member does not exist."} /></Alert>
        <Link href="/write" className="font-semibold text-accent">
          <Tr s={"← SANTALIQ Write"} /></Link>
      </div>
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit space-y-4">
        <div
          aria-hidden
          className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-bold text-accent"
        >
          {p.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{p.display_name}</h1>
          {p.joined && <p className="text-sm text-muted"><Tr s={"Member since"} />{" "}{isoDate(p.joined).slice(0, 7)}</p>}
        </div>
        {p.bio && <p className="leading-relaxed whitespace-pre-line">{p.bio}</p>}
        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-center">
          <div>
            <dt className="text-xs text-muted"><Tr s={"Published pieces"} /></dt>
            <dd className="text-2xl font-bold tabular-nums">{p.published_posts}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted"><Tr s={"Verified words"} /></dt>
            <dd className="text-2xl font-bold tabular-nums">{p.verified_entries}</dd>
          </div>
        </dl>
      </Card>

      <div>
        <h2 className="text-2xl font-bold"><Tr s={"Writing"} /></h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-muted"><Tr s={"No published pieces yet."} /></p>
        ) : (
          <div className="mt-6 grid gap-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/write/${post.slug}`}
                className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-5 shadow-card transition-colors hover:border-accent/40"
              >
                <p className="text-xs font-medium tracking-wide text-accent uppercase"><Tr s={KIND_LABEL[post.kind]} /></p>
                <h3 className="mt-1 text-xl font-bold">{post.title}</h3>
                <p className="mt-2 line-clamp-2 text-muted">{post.excerpt}</p>
                <p className="mt-3 text-xs text-muted">{isoDate(post.published_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PersonPage(props: Props) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="text-muted"><Tr s={"Loading…"} /></p>}>
        <ProfileView {...props} />
      </Suspense>
    </section>
  );
}
