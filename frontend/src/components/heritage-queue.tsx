"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, EntryStatus, Input } from "@/components/ui";
import { api, type Status, type User } from "@/lib/api";
import { HERITAGE_LABEL, type HeritageItem } from "@/lib/heritage";

/** Reviewer queue for SANTALIQ Heritage submissions. */
export function HeritageQueue({ me, onChange }: { me: User; onChange?: () => void }) {
  const [status, setStatus] = useState<Status>("pending");
  const [items, setItems] = useState<HeritageItem[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<HeritageItem[]>(`/admin/heritage?status=${status}`)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function decide(id: string, decision: "verified" | "rejected") {
    setError(null);
    try {
      await api(`/admin/heritage/${id}`, { method: "POST", body: JSON.stringify({ decision, note: notes[id]?.trim() || null }) });
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Heritage review</h2>
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
        Check the source and consent. Reject anything sacred or private, or anything you cannot verify with the community.
      </p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 grid gap-4">
        {!items && <p className="text-muted">Loading…</p>}
        {items?.length === 0 && <Alert tone="info">Nothing {status} right now.</Alert>}
        {items?.map((i) => (
          <Card key={i.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted">
                  {HERITAGE_LABEL[i.kind]}
                  {i.region && ` · ${i.region}`} · by {i.contributor?.display_name ?? "former member"}
                </p>
                <Link href={`/heritage/${i.slug}`} className="text-lg font-bold hover:text-accent">
                  {i.title}
                </Link>
              </div>
              <EntryStatus status={i.status} />
            </div>
            <p className="text-sm">
              <span className="font-semibold">Source:</span> <span className="text-muted">{i.source}</span>
            </p>
            <button onClick={() => setOpen(open === i.id ? null : i.id)} className="text-sm font-medium text-accent">
              {open === i.id ? "Hide text" : "Read full text"}
            </button>
            {open === i.id && (
              <div className="max-h-96 overflow-auto rounded-xl bg-bg-sunken p-4 text-sm leading-relaxed whitespace-pre-wrap">{i.body}</div>
            )}
            {i.review_note && status !== "pending" && <p className="text-sm text-muted">Note: {i.review_note}</p>}
            {status === "pending" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  placeholder="Note for the contributor (optional)"
                  value={notes[i.id] ?? ""}
                  onChange={(ev) => setNotes((n) => ({ ...n, [i.id]: ev.target.value }))}
                  maxLength={2000}
                />
                <div className="flex shrink-0 gap-2">
                  <Button onClick={() => decide(i.id, "verified")}>Verify</Button>
                  <Button variant="danger" onClick={() => decide(i.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              me.role === "admin" && (
                <Button variant="secondary" onClick={() => decide(i.id, status === "verified" ? "rejected" : "verified")}>
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
