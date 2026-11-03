"use client";

import Link from "next/link";
import { tr } from "@/lib/i18n";
import { formatDate, KIND_LABEL, type PostCard } from "@/lib/write";

/** Grid of writing cards (used by the feed and news pages). */
export function PostList({ items }: { items: PostCard[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/write/${p.slug}`}
          className="group rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
        >
          <p className="text-xs font-medium tracking-wide text-accent uppercase">{tr(KIND_LABEL[p.kind])}</p>
          <h2 className="mt-2 text-2xl font-bold leading-snug">{p.title}</h2>
          <p className="mt-3 line-clamp-3 leading-relaxed text-muted">{p.excerpt}</p>
          <p className="mt-5 text-sm text-muted">
            {p.author.display_name} · {formatDate(p.published_at)}
          </p>
        </Link>
      ))}
    </div>
  );
}
