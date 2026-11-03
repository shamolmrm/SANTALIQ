"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Alert, PageHeader } from "@/components/ui";
import { timeAgo } from "@/lib/admin";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";

type Conversation = { user_id: string; name: string; last: string; last_at: string; unread: number };

function Inbox() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  useEffect(() => {
    api<Conversation[]>("/messages")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  if (!items) return <p className="text-muted">{tr("Loading…")}</p>;
  if (items.length === 0)
    return <Alert tone="info">{tr("No messages yet. Open a member's profile and press “Send a message” to start a conversation.")}</Alert>;
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-bg-elevated">
      {items.map((c) => (
        <li key={c.user_id}>
          <Link href={`/messages/${c.user_id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-bg-sunken">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent">
              {c.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${c.unread ? "font-bold" : "font-medium"}`}>{c.name}</span>
              <span className="block truncate text-sm text-muted">{c.last}</span>
            </span>
            <span className="text-right text-xs text-muted">
              {timeAgo(c.last_at)}
              {c.unread > 0 && <span className="mt-1 block rounded-full bg-accent-2 px-2 text-white tabular-nums">{c.unread}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function MessagesPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <PageHeader eyebrow={tr("SANTALIQ Connect")} title={tr("Messages")} lead={tr("Private conversations with other members. You can block anyone at any time.")} />
      <div className="mt-10">
        <RequireSession>{() => <Inbox />}</RequireSession>
      </div>
    </section>
  );
}
