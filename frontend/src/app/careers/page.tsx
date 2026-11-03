"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { JOB_KINDS, JOB_LABEL, type Job, type JobKind } from "@/lib/careers";
import { tr } from "@/lib/i18n";

export default function CareersPage() {
  const [kind, setKind] = useState<JobKind | "all">("all");
  const [jobs, setJobs] = useState<Job[] | null>(null);

  useEffect(() => {
    api<Job[]>(`/careers${kind === "all" ? "" : `?kind=${kind}`}`)
      .then(setJobs)
      .catch(() => setJobs([]));
  }, [kind]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <PageHeader
          eyebrow={tr("SANTALIQ Career")}
          title={tr("Jobs, internships and scholarships.")}
          lead={tr("Opportunities for the Santali community. Every listing is checked by a reviewer before it appears, to keep out scams.")}
        />
        <Link href="/careers/new" className="rounded-full bg-fg px-6 py-3 font-semibold text-bg">
          {tr("Post an opportunity")}
        </Link>
      </div>
      <div role="tablist" className="mt-10 flex flex-wrap gap-2">
        {[{ value: "all" as const, label: "All" }, ...JOB_KINDS].map((k) => (
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
      <div className="mt-8">
        {!jobs && <p className="text-muted">{tr("Loading…")}</p>}
        {jobs?.length === 0 && <Alert tone="info">{tr("No open listings right now. Check back soon, or post one you know about.")}</Alert>}
        <div className="grid gap-4 md:grid-cols-2">
          {jobs?.map((j) => (
            <Link
              key={j.id}
              href={`/careers/${j.id}`}
              className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card transition-colors hover:border-accent/40"
            >
              <p className="text-xs font-medium tracking-wide text-accent uppercase">{tr(JOB_LABEL[j.kind])}</p>
              <h2 className="mt-2 text-xl font-bold">{j.title}</h2>
              <p className="mt-1 text-muted">
                {j.organization}
                {j.location && ` · ${j.location}`}
              </p>
              {j.deadline && (
                <p className="mt-3 text-sm">
                  {tr("Deadline:")} <strong>{j.deadline}</strong>
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
