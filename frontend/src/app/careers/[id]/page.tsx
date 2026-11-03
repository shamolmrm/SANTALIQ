"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, EntryStatus } from "@/components/ui";
import { api } from "@/lib/api";
import { JOB_LABEL, type Job } from "@/lib/careers";
import { tr } from "@/lib/i18n";

function JobView() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Job>(`/careers/${encodeURIComponent(id)}`)
      .then(setJob)
      .catch(() => setError(tr("This listing does not exist or is no longer open.")));
  }, [id]);

  if (error)
    return (
      <div className="space-y-6">
        <Alert>{error}</Alert>
        <Link href="/careers" className="font-semibold text-accent">
          {tr("← All opportunities")}
        </Link>
      </div>
    );
  if (!job) return <p className="text-muted">{tr("Loading…")}</p>;

  return (
    <article>
      <Link href="/careers" className="text-sm text-muted hover:text-fg">
        {tr("← All opportunities")}
      </Link>
      {job.status !== "verified" && (
        <div className="mt-6 flex items-center gap-3">
          <EntryStatus status={job.status} />
          {job.review_note && <span className="text-sm text-muted">{job.review_note}</span>}
        </div>
      )}
      <p className="mt-8 text-xs font-semibold tracking-wide text-accent uppercase">{tr(JOB_LABEL[job.kind])}</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">{job.title}</h1>
      <p className="mt-3 text-lg text-muted">
        {job.organization}
        {job.location && ` · ${job.location}`}
      </p>
      {job.deadline && (
        <p className="mt-4">
          {tr("Deadline:")} <strong>{job.deadline}</strong>
        </p>
      )}
      <div className="mt-8 leading-relaxed whitespace-pre-wrap">{job.description}</div>
      <div className="mt-10 flex flex-wrap gap-3">
        {job.apply_url && (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full bg-fg px-6 py-3 font-semibold text-bg">
            {tr("Apply ↗")}
          </a>
        )}
        {job.apply_email && (
          <a href={`mailto:${job.apply_email}`} className="rounded-full border border-line px-6 py-3 font-semibold">
            {job.apply_email}
          </a>
        )}
      </div>
      <p className="mt-10 rounded-xl bg-bg-sunken p-4 text-sm text-muted">
        {tr("SANTALIQ checks listings but cannot guarantee them. Never pay money to apply for a job. Report anything suspicious.")}{" "}
        <Link href="/contact" className="font-semibold text-accent">
          {tr("Contact")}
        </Link>
      </p>
    </article>
  );
}

export default function JobPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="text-muted">…</p>}>
        <JobView />
      </Suspense>
    </section>
  );
}
