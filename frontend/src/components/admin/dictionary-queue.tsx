"use client";

import { useCallback, useEffect, useState } from "react";
import { EntryCard } from "@/components/entry-card";
import { Alert, Button, Input } from "@/components/ui";
import { api, type Entry, type Status, type User } from "@/lib/api";

/** Reviewer queue for dictionary contributions. */
export function DictionaryQueue({ me, onChange }: { me: User; onChange: () => void }) {
  const [status, setStatus] = useState<Status>("pending");
  const [data, setData] = useState<{ total: number; items: Entry[] } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ total: number; items: Entry[] }>(`/admin/review?status=${status}&limit=50`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function decide(id: string, decision: "verified" | "rejected") {
    setError(null);
    try {
      await api(`/admin/review/${id}`, { method: "POST", body: JSON.stringify({ decision, note: notes[id]?.trim() || null }) });
      load();
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Dictionary review</h2>
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
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6 grid gap-4">
        {!data && <p className="text-muted">Loading…</p>}
        {data && data.items.length === 0 && <Alert tone="info">Nothing {status} right now.</Alert>}
        {data?.items.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            showStatus
            actions={
              status === "pending" ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Note for the contributor (optional)"
                    value={notes[e.id] ?? ""}
                    onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))}
                    maxLength={2000}
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => decide(e.id, "verified")}>Verify</Button>
                    <Button variant="danger" onClick={() => decide(e.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </div>
              ) : me.role === "admin" ? (
                <Button variant="secondary" onClick={() => decide(e.id, status === "verified" ? "rejected" : "verified")}>
                  Change to {status === "verified" ? "rejected" : "verified"}
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
