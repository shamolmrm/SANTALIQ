"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminTitle, useAdmin } from "@/components/admin/shell";
import { ReportsQueue } from "@/components/reports-queue";
import { Alert, Button, EntryStatus, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, KIND_LABEL, type PostCard } from "@/lib/write";

function Posts() {
  const { refresh } = useAdmin();
  const [status, setStatus] = useState<"" | "published" | "removed">("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ total: number; items: PostCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ limit: "100" });
    if (status) p.set("status", status);
    if (q.trim()) p.set("q", q.trim());
    api<{ total: number; items: PostCard[] }>(`/admin/posts?${p}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [status, q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function moderate(id: string, action: "remove" | "restore") {
    const note = action === "remove" ? (window.prompt("Reason shown to the author (optional)") ?? undefined) : undefined;
    try {
      await api(`/admin/posts/${id}/moderate`, { method: "POST", body: JSON.stringify({ action, note }) });
      load();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Writing</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status" className="py-2">
            <option value="">Published + removed</option>
            <option value="published">Published</option>
            <option value="removed">Removed</option>
          </Select>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or author" aria-label="Search" className="max-w-xs py-2" />
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">Drafts are private to their authors and never listed here.</p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-bg-elevated">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td className="max-w-xs truncate px-4 py-3 font-medium">
                  <Link href={`/write/${p.slug}`} className="hover:text-accent">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/people/${p.author.id}`} className="text-muted hover:text-fg">
                    {p.author.display_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{KIND_LABEL[p.kind]}</td>
                <td className="px-4 py-3 text-muted">{formatDate(p.published_at)}</td>
                <td className="px-4 py-3">
                  <EntryStatus status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant={p.status === "removed" ? "secondary" : "danger"} onClick={() => moderate(p.id, p.status === "removed" ? "restore" : "remove")}>
                    {p.status === "removed" ? "Restore" : "Remove"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && <p className="p-4 text-muted">Loading…</p>}
        {data?.items.length === 0 && <p className="p-4 text-muted">Nothing here.</p>}
      </div>
    </div>
  );
}

export default function ContentPage() {
  return (
    <div>
      <AdminTitle title="Content" lead="Moderate SANTALIQ Write. Heritage items are managed in Review." />
      <div className="space-y-12">
        <ReportsQueue />
        <Posts />
      </div>
    </div>
  );
}
