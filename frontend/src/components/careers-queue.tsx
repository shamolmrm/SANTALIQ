"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, EntryStatus, Input } from "@/components/ui";
import { api, type Status, type User } from "@/lib/api";
import { JOB_LABEL, type Job } from "@/lib/careers";

/** Reviewer queue for career listings. */
export function CareersQueue({ me, onChange }: { me: User; onChange?: () => void }) {
  const [status, setStatus] = useState<Status>("pending");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Job[]>(`/admin/careers?status=${status}`)
      .then(setJobs)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function decide(id: string, decision: "verified" | "rejected") {
    setError(null);
    try {
      await api(`/admin/careers/${id}`, { method: "POST", body: JSON.stringify({ decision, note: notes[id]?.trim() || null }) });
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Career review</h2>
        <div role="tablist" className="flex gap-2">
          {(["pending", "verified", "rejected"] as Status[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize ${status === s ? "bg-fg text-bg" : "border border-line text-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        Check that the organization is real and the link is official. Reject anything that asks applicants to pay.
      </p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 grid gap-4">
        {!jobs && <p className="text-muted">Loading…</p>}
        {jobs?.length === 0 && <Alert tone="info">Nothing {status} right now.</Alert>}
        {jobs?.map((j) => (
          <Card key={j.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted">
                  {JOB_LABEL[j.kind]} · by {j.posted_by ?? "former member"}
                  {j.deadline && ` · deadline ${j.deadline}`}
                </p>
                <p className="text-lg font-bold">{j.title}</p>
                <p className="text-sm text-muted">
                  {j.organization}
                  {j.location && ` · ${j.location}`}
                </p>
              </div>
              <EntryStatus status={j.status} />
            </div>
            <p className="max-h-60 overflow-auto rounded-xl bg-bg-sunken p-3 text-sm whitespace-pre-wrap">{j.description}</p>
            <p className="text-sm break-all">
              {j.apply_url && (
                <a href={j.apply_url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent">
                  {j.apply_url}
                </a>
              )}
              {j.apply_email && <span className="ml-2">{j.apply_email}</span>}
            </p>
            {status === "pending" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  placeholder="Note for the poster (optional)"
                  value={notes[j.id] ?? ""}
                  onChange={(ev) => setNotes((n) => ({ ...n, [j.id]: ev.target.value }))}
                  maxLength={2000}
                />
                <div className="flex shrink-0 gap-2">
                  <Button onClick={() => decide(j.id, "verified")}>Verify</Button>
                  <Button variant="danger" onClick={() => decide(j.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              me.role === "admin" && (
                <Button variant="secondary" onClick={() => decide(j.id, status === "verified" ? "rejected" : "verified")}>
                  Change to {status === "verified" ? "rejected" : "verified"}
                </Button>
              )
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
