"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostList } from "@/components/post-list";
import { Alert, PageHeader } from "@/components/ui";
import { api, hasRole, useSession } from "@/lib/api";
import { tr } from "@/lib/i18n";
import type { PostCard } from "@/lib/write";

export default function NewsPage() {
  const { user } = useSession();
  const [data, setData] = useState<{ total: number; items: PostCard[] } | null>(null);
  useEffect(() => {
    api<{ total: number; items: PostCard[] }>("/write/posts?kind=news&limit=50")
      .then(setData)
      .catch(() => setData({ total: 0, items: [] }));
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <PageHeader
          eyebrow={tr("SANTALIQ News")}
          title={tr("Community and regional news.")}
          lead={tr("News is published only by SANTALIQ reviewers, so it can be trusted. Readable in every Santali script.")}
        />
        {hasRole(user, "reviewer") && (
          <Link href="/write/new" className="rounded-full bg-fg px-6 py-3 font-semibold text-bg">
            {tr("Write news")}
          </Link>
        )}
      </div>
      <div className="mt-10">
        {!data && <p className="text-muted">{tr("Loading…")}</p>}
        {data?.items.length === 0 && (
          <Alert tone="info">
            {tr("No news yet. Have a story the community should know? Send it to us.")}{" "}
            <Link href="/contact" className="font-semibold text-accent">
              {tr("Contact")}
            </Link>
          </Alert>
        )}
        {data && data.items.length > 0 && <PostList items={data.items} />}
      </div>
    </section>
  );
}
