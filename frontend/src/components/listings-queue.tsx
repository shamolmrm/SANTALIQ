"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, EntryStatus, Input } from "@/components/ui";
import { api, type Status, type User } from "@/lib/api";
import { categoryLabel, type Listing, SECTIONS } from "@/lib/listings";

/** Reviewer queue for Market, Media and Library listings. */
export function ListingsQueue({ me, onChange }: { me: User; onChange?: () => void }) {
  const [status, setStatus] = useState<Status>("pending");
  const [items, setItems] = useState<Listing[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Listing[]>(`/admin/listings?status=${status}`)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function decide(id: string, decision: "verified" | "rejected") {
    try {
      await api(`/admin/listings/${id}`, { method: "POST", body: JSON.stringify({ decision, note: notes[id]?.trim() || null }) });
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Market · Media · Library review</h2>
        <div className="flex gap-2">
          {(["pending", "verified", "rejected"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize ${status === s ? "bg-fg text-bg" : "border border-line text-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        Reject scams, copyrighted files or pirated links, unsafe items, and photos of people shared without permission.
      </p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {!items && <p className="text-muted">Loading…</p>}
        {items?.length === 0 && <Alert tone="info">Nothing {status} right now.</Alert>}
        {items?.map((x) => (
          <Card key={x.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted">
                  {SECTIONS[x.section].eyebrow} · {categoryLabel(x.section, x.category)} · by {x.posted_by ?? "former member"}
                </p>
                <Link href={`/listings/${x.id}`} className="text-lg font-bold hover:text-accent">
                  {x.title}
                </Link>
              </div>
              <EntryStatus status={x.status} />
            </div>
            {x.image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- user upload under review
              <img src={x.image_url} alt="" className="max-h-48 rounded-xl object-cover" />
            )}
            <p className="line-clamp-4 text-sm whitespace-pre-wrap">{x.description}</p>
            <p className="text-xs break-all text-muted">{[x.url, x.contact, x.price, x.credit].filter(Boolean).join(" · ")}</p>
            {status === "pending" ? (
              <div className="space-y-2">
                <Input placeholder="Note (optional)" value={notes[x.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [x.id]: e.target.value }))} />
                <div className="flex gap-2">
                  <Button onClick={() => decide(x.id, "verified")}>Verify</Button>
                  <Button variant="danger" onClick={() => decide(x.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              me.role === "admin" && (
                <Button variant="secondary" onClick={() => decide(x.id, status === "verified" ? "rejected" : "verified")}>
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
