"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Alert, EntryStatus, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, KIND_LABEL, type PostCard } from "@/lib/write";

function MyWriting() {
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<PostCard[]>("/write/me/posts").then(setPosts).catch((e) => setError(e.message));
  }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!posts) return <p className="text-muted">Loading…</p>;
  if (posts.length === 0)
    return (
      <Alert tone="info">
        You have not written anything yet.{" "}
        <Link href="/write/new" className="font-semibold text-accent">
          Start writing →
        </Link>
      </Alert>
    );
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-bg-elevated">
      {posts.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <Link href={`/write/${p.slug}`} className="text-lg font-semibold hover:text-accent">
              {p.title}
            </Link>
            <p className="text-sm text-muted">
              {KIND_LABEL[p.kind]} · updated {formatDate(p.updated_at)}
            </p>
          </div>
          <EntryStatus status={p.status} />
          {p.status !== "removed" && (
            <Link href={`/write/edit/${p.id}`} className="rounded-full border border-line px-4 py-1.5 text-sm">
              Edit
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MyWritingPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="SANTALIQ Write" title="My writing" />
        <Link href="/write/new" className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg">
          New piece
        </Link>
      </div>
      <div className="mt-10">
        <RequireSession>{() => <MyWriting />}</RequireSession>
      </div>
    </section>
  );
}
