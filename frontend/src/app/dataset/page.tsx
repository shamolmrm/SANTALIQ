"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Card, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

type Meta = { count: number; license: string; citation: string; generated_at: string };
type Contributor = { id: string; display_name: string; verified_entries: number };

export default function DatasetPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [people, setPeople] = useState<Contributor[] | null>(null);

  useEffect(() => {
    api<Meta>("/dataset/lexicon.json").then(setMeta).catch(() => setMeta(null));
    api<Contributor[]>("/dictionary/contributors").then(setPeople).catch(() => setPeople([]));
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow="SANTALIQ Research · Open Dataset v1"
        title="Santali Lexicon dataset"
        lead="Every verified dictionary entry on SANTALIQ — spellings in five scripts, meanings, sources and contributor credit — as downloadable data for researchers and developers."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-[1fr_320px]">
        <Card className="space-y-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl font-bold tabular-nums">{meta ? meta.count : "—"}</span>
            <span className="text-muted">verified entries</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/api/v1/dataset/lexicon.json" download className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg">
              Download JSON
            </a>
            <a href="/api/v1/dataset/lexicon.csv" download className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">
              Download CSV
            </a>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold">Licence</dt>
              <dd className="text-muted">{meta?.license ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Cite as</dt>
              <dd className="text-muted">{meta?.citation ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold">What is included</dt>
              <dd className="text-muted">
                Only entries a reviewer has verified. Each has its source and contributor. Pending or rejected entries, user accounts and
                emails are never included.
              </dd>
            </div>
          </dl>
          {meta?.count === 0 && (
            <Alert tone="info">
              The dataset grows as the community adds words.{" "}
              <Link href="/contribute" className="font-semibold text-accent">
                Contribute an entry →
              </Link>
            </Alert>
          )}
        </Card>

        <Card>
          <h2 className="font-bold">Community credits</h2>
          <p className="mt-1 text-sm text-muted">Contributors with verified entries.</p>
          {!people && <p className="mt-4 text-sm text-muted">Loading…</p>}
          {people?.length === 0 && <p className="mt-4 text-sm text-muted">Be the first verified contributor.</p>}
          <ol className="mt-4 space-y-2">
            {people?.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-right text-muted tabular-nums">{i + 1}</span>
                <span className="flex-1 font-medium">{p.display_name}</span>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent tabular-nums">{p.verified_entries}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </section>
  );
}
