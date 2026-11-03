"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, KIND_LABEL, KINDS, type PostCard, type PostKind } from "@/lib/write";

export default function WriteHome() {
  const [kind, setKind] = useState<PostKind | "all">("all");
  const [data, setData] = useState<{ total: number; items: PostCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ total: number; items: PostCard[] }>(`/write/posts?limit=50${kind === "all" ? "" : `&kind=${kind}`}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [kind]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <PageHeader
          eyebrow="SANTALIQ Write"
          title="Santali writing, in every script."
          lead="Articles, poetry, stories and essays by Santali writers. Read any piece in Ol Chiki, Roman, Bengali, Odia or Devanagari."
        />
        <Link href="/write/new" className="rounded-full bg-fg px-6 py-3 font-semibold text-bg shadow-card hover:opacity-90">
          Start writing
        </Link>
      </div>

      <div role="tablist" aria-label="Filter by kind" className="mt-12 flex flex-wrap gap-2">
        {[{ value: "all" as const, label: "All" }, ...KINDS].map((k) => (
          <button
            key={k.value}
            role="tab"
            aria-selected={kind === k.value}
            onClick={() => setKind(k.value)}
            className={`rounded-full px-4 py-1.5 text-sm ${kind === k.value ? "bg-fg text-bg" : "border border-line text-muted hover:text-fg"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {error && <Alert>{error}</Alert>}
        {!data && !error && <p className="text-muted">Loading…</p>}
        {data && data.items.length === 0 && (
          <Alert tone="info">
            Nothing published here yet. Be the first —{" "}
            <Link href="/write/new" className="font-semibold text-accent">
              write something →
            </Link>
          </Alert>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          {data?.items.map((p) => (
            <Link
              key={p.id}
              href={`/write/${p.slug}`}
              className="group rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
            >
              <p className="text-xs font-medium tracking-wide text-accent uppercase">{KIND_LABEL[p.kind]}</p>
              <h2 className="mt-2 text-2xl font-bold leading-snug">{p.title}</h2>
              <p className="mt-3 line-clamp-3 leading-relaxed text-muted">{p.excerpt}</p>
              <p className="mt-5 text-sm text-muted">
                {p.author.display_name} · {formatDate(p.published_at)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
