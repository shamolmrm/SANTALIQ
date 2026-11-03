"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, KIND_LABEL, type PostCard } from "@/lib/write";

type Reported = { post: PostCard; open_reports: number; reasons: string[]; last_reported_at: string | null };

export function ReportsQueue() {
  const [items, setItems] = useState<Reported[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Reported[]>("/admin/reports").then(setItems).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function act(id: string, action: "remove" | "dismiss") {
    setError(null);
    try {
      await api(`/admin/posts/${id}/moderate`, { method: "POST", body: JSON.stringify({ action, note: notes[id]?.trim() || null }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">Reported writing</h2>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6 grid gap-4">
        {!items && <p className="text-muted">Loading…</p>}
        {items?.length === 0 && <Alert tone="info">No open reports.</Alert>}
        {items?.map(({ post, open_reports, reasons, last_reported_at }) => (
          <div key={post.id} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/write/${post.slug}`} target="_blank" className="text-lg font-semibold hover:text-accent">
                  {post.title}
                </Link>
                <p className="text-sm text-muted">
                  {KIND_LABEL[post.kind]} by {post.author.display_name} · last report {formatDate(last_reported_at)}
                </p>
              </div>
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                {open_reports} report{open_reports > 1 ? "s" : ""}
              </span>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
              <Input
                placeholder="Note to the author (optional)"
                value={notes[post.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [post.id]: e.target.value }))}
                maxLength={1000}
              />
              <div className="flex shrink-0 gap-2">
                <Button variant="danger" onClick={() => act(post.id, "remove")}>
                  Remove
                </Button>
                <Button variant="secondary" onClick={() => act(post.id, "dismiss")}>
                  Dismiss reports
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
