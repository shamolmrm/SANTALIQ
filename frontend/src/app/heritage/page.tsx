"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { HERITAGE_KINDS, HERITAGE_LABEL, type HeritageCard, type HeritageKind } from "@/lib/heritage";

import { tr } from "@/lib/i18n";
export default function HeritageHome() {
  const [kind, setKind] = useState<HeritageKind | "all">("all");
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ total: number; items: HeritageCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "60" });
    if (kind !== "all") params.set("kind", kind);
    if (q.trim()) params.set("q", q.trim());
    const t = setTimeout(() => {
      api<{ total: number; items: HeritageCard[] }>(`/heritage/items?${params}`)
        .then(setData)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [kind, q]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <PageHeader
          eyebrow={tr("SANTALIQ Heritage · Beta")}
          title={tr("A living archive, kept by the community.")}
          lead={tr("Folk stories, songs, festivals, history and traditional knowledge, shared with permission and checked by reviewers before they appear here.")}
        />
        <Link href="/heritage/submit" className="rounded-full bg-fg px-6 py-3 font-semibold text-bg shadow-card hover:opacity-90">
          {tr("Share something")}</Link>
      </div>

      <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label={tr("Filter by kind")} className="flex flex-wrap gap-2">
          {[{ value: "all" as const, label: "All" }, ...HERITAGE_KINDS].map((k) => (
            <button
              key={k.value}
              role="tab"
              aria-selected={kind === k.value}
              onClick={() => setKind(k.value)}
              className={`rounded-full px-4 py-1.5 text-sm ${kind === k.value ? "bg-fg text-bg" : "border border-line text-muted hover:text-fg"}`}
            >
              {tr(k.label)}
            </button>
          ))}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search title or region")} aria-label={tr("Search")} className="md:max-w-xs" />
      </div>

      <div className="mt-8">
        {error && <Alert>{error}</Alert>}
        {!data && !error && <p className="text-muted">{tr("Loading…")}</p>}
        {data && data.items.length === 0 && (
          <Alert tone="info">
            {q || kind !== "all" ? tr("Nothing matches yet.") : tr("The archive is just starting. Nothing has been verified yet.")}{" "}
            <Link href="/heritage/submit" className="font-semibold text-accent">
              {tr("Share a story, song or memory →")}</Link>
          </Alert>
        )}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((i) => (
            <Link
              key={i.id}
              href={`/heritage/${i.slug}`}
              className="group rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
            >
              <p className="text-xs font-medium tracking-wide text-accent-2 uppercase">{tr(HERITAGE_LABEL[i.kind])}</p>
              <h2 className="mt-2 text-xl font-bold leading-snug">{i.title}</h2>
              <p className="mt-3 line-clamp-3 leading-relaxed text-muted">{i.excerpt}</p>
              {i.region && <p className="mt-4 text-sm text-muted">{i.region}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
