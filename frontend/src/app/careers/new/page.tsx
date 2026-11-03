"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Alert, Button, Card, EntryStatus, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { JOB_KINDS, JOB_LABEL, type Job } from "@/lib/careers";
import { tr } from "@/lib/i18n";

function MyListings({ refresh }: { refresh: number }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const load = useCallback(() => {
    api<Job[]>("/careers/mine")
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);
  useEffect(load, [load, refresh]);

  async function remove(id: string) {
    if (!window.confirm(tr("Remove this listing?"))) return;
    await api(`/careers/${id}`, { method: "DELETE" });
    load();
  }

  if (!jobs) return <p className="text-muted">{tr("Loading…")}</p>;
  if (jobs.length === 0) return <p className="text-sm text-muted">{tr("You have not posted any listings yet.")}</p>;
  return (
    <ul className="grid gap-3">
      {jobs.map((j) => (
        <li key={j.id} className="rounded-xl border border-line bg-bg-elevated p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/careers/${j.id}`} className="font-semibold hover:text-accent">
              {j.title}
            </Link>
            <EntryStatus status={j.status} />
          </div>
          <p className="mt-1 text-xs text-muted">{tr(JOB_LABEL[j.kind])}</p>
          {j.review_note && <p className="mt-2 text-muted">{tr("Reviewer note:")} {j.review_note}</p>}
          <button onClick={() => remove(j.id)} className="mt-2 text-xs text-muted hover:text-fg">
            {tr("Remove")}
          </button>
        </li>
      ))}
    </ul>
  );
}

function JobForm({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = Object.fromEntries(new FormData(formEl).entries()) as Record<string, string>;
    const body = {
      kind: f.kind,
      title: f.title,
      organization: f.organization,
      location: f.location || null,
      description: f.description,
      apply_url: f.apply_url || null,
      apply_email: f.apply_email || null,
      deadline: f.deadline || null,
    };
    setBusy(true);
    setMsg(null);
    try {
      await api("/careers", { method: "POST", body: JSON.stringify(body) });
      formEl.reset();
      setMsg({ tone: "success", text: tr("Thank you! A reviewer will check the listing before it is public.") });
      onDone();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : tr("Could not submit.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={tr("Kind")}>
          <Select name="kind" defaultValue="job">
            {JOB_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {tr(JOB_LABEL[k.value])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Deadline (optional)")}>
          <Input name="deadline" type="date" />
        </Field>
      </div>
      <Field label={tr("Title")}>
        <Input name="title" required minLength={3} maxLength={200} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={tr("Organization")}>
          <Input name="organization" required minLength={2} maxLength={200} />
        </Field>
        <Field label={tr("Location (optional)")}>
          <Input name="location" maxLength={200} />
        </Field>
      </div>
      <Field label={tr("Description")} hint={tr("Who can apply, what the work or support is, and how to apply.")}>
        <Textarea name="description" required minLength={20} maxLength={10000} rows={8} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={tr("Application link (https://…)")}>
          <Input name="apply_url" type="url" pattern="https://.*" maxLength={500} />
        </Field>
        <Field label={tr("Or application email")}>
          <Input name="apply_email" type="email" maxLength={254} />
        </Field>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? tr("Sending…") : tr("Send for review")}
      </Button>
    </form>
  );
}

export default function NewJobPage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow={tr("SANTALIQ Career")}
        title={tr("Post an opportunity")}
        lead={tr("Share a real job, internship, scholarship or training for Santali speakers. Listings that ask applicants for money are rejected.")}
      />
      <div className="mt-10">
        <RequireSession>
          {() => (
            <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
              <Card>
                <JobForm onDone={() => setRefresh((n) => n + 1)} />
              </Card>
              <div>
                <h2 className="text-lg font-bold">{tr("My listings")}</h2>
                <div className="mt-4">
                  <MyListings refresh={refresh} />
                </div>
              </div>
            </div>
          )}
        </RequireSession>
      </div>
    </section>
  );
}
