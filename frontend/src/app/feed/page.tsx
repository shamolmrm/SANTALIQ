"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostList } from "@/components/post-list";
import { RequireSession } from "@/components/require-session";
import { Alert, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import type { PostCard } from "@/lib/write";

function Feed() {
  const [data, setData] = useState<{ total: number; items: PostCard[] } | null>(null);
  useEffect(() => {
    api<{ total: number; items: PostCard[] }>("/feed?limit=50")
      .then(setData)
      .catch(() => setData({ total: 0, items: [] }));
  }, []);
  if (!data) return <p className="text-muted">{tr("Loading…")}</p>;
  if (data.items.length === 0)
    return (
      <Alert tone="info">
        {tr("Your feed is empty. Follow writers from their profile pages to see their new pieces here.")}{" "}
        <Link href="/write" className="font-semibold text-accent">
          {tr("Find writers →")}
        </Link>
      </Alert>
    );
  return <PostList items={data.items} />;
}

export default function FeedPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader eyebrow={tr("SANTALIQ Social")} title={tr("Your feed")} lead={tr("New writing from the people you follow.")} />
      <div className="mt-10">
        <RequireSession>{() => <Feed />}</RequireSession>
      </div>
    </section>
  );
}
