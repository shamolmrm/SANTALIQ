"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminOnly, AdminTitle, useAdmin } from "@/components/admin/shell";
import { Alert, Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/admin";

type Message = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  user_id: string | null;
  status: "new" | "done";
  created_at: string;
};

const TOPIC_LABEL: Record<string, string> = {
  general: "General",
  language: "Santali language",
  data_request: "My data",
  report: "Report",
  partnership: "Partnership",
};

function Inbox() {
  const { refresh } = useAdmin();
  const [status, setStatus] = useState<"new" | "done" | "">("new");
  const [items, setItems] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Message[]>(`/admin/messages${status ? `?status=${status}` : ""}`)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function mark(id: string, s: "new" | "done") {
    await api(`/admin/messages/${id}`, { method: "PATCH", body: JSON.stringify({ status: s }) });
    load();
    refresh();
  }

  return (
    <div>
      <div role="tablist" className="mb-6 flex gap-2">
        {(
          [
            ["new", "New"],
            ["done", "Done"],
            ["", "All"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={label}
            role="tab"
            aria-selected={status === v}
            onClick={() => setStatus(v)}
            className={`rounded-full px-4 py-1.5 text-sm ${status === v ? "bg-fg text-bg" : "border border-line text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {!items && <p className="text-muted">Loading…</p>}
      {items?.length === 0 && <Alert tone="info">No messages here.</Alert>}
      <div className="grid gap-4">
        {items?.map((m) => (
          <Card key={m.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {m.name} <span className="font-normal text-muted">&lt;{m.email}&gt;</span>
                  {m.user_id && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">member</span>}
                </p>
                <p className="text-xs text-muted">
                  {TOPIC_LABEL[m.topic] ?? m.topic} · {timeAgo(m.created_at)}
                </p>
              </div>
              {m.topic === "data_request" && <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-medium">Reply within 30 days</span>}
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to SANTALIQ")}`}
                className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg"
              >
                Reply by email
              </a>
              <Button variant="secondary" onClick={() => mark(m.id, m.status === "new" ? "done" : "new")}>
                Mark as {m.status === "new" ? "done" : "new"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AdminOnly>
      <AdminTitle title="Messages" lead="Sent through the contact form. Data requests must be answered within 30 days." />
      <Inbox />
    </AdminOnly>
  );
}
