"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Alert, PageHeader } from "@/components/ui";
import { timeAgo } from "@/lib/admin";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { describe, type Notice } from "@/lib/notifications";

function List() {
  const [items, setItems] = useState<Notice[] | null>(null);
  useEffect(() => {
    api<{ items: Notice[] }>("/notifications")
      .then((r) => {
        setItems(r.items);
        if (r.items.some((n) => !n.read))
          api("/notifications/read", { method: "POST" }).then(() => window.dispatchEvent(new Event("santaliq:notifications-read")));
      })
      .catch(() => setItems([]));
  }, []);

  if (!items) return <p className="text-muted">{tr("Loading…")}</p>;
  if (items.length === 0) return <Alert tone="info">{tr("No notifications yet. You will hear here when your contributions are reviewed or someone follows you.")}</Alert>;
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-bg-elevated">
      {items.map((n) => {
        const { text, href } = describe(n);
        return (
          <li key={n.id}>
            <Link href={href} className={`flex gap-3 px-5 py-4 hover:bg-bg-sunken ${n.read ? "" : "font-semibold"}`}>
              <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent-2"}`} />
              <span className="flex-1">
                {text}
                {n.data.note && <span className="mt-1 block text-sm font-normal text-muted">“{n.data.note}”</span>}
              </span>
              <span className="shrink-0 text-xs font-normal text-muted">{timeAgo(n.created_at)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function NotificationsPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <PageHeader eyebrow={tr("SANTALIQ Connect")} title={tr("Notifications")} />
      <div className="mt-10">
        <RequireSession>{() => <List />}</RequireSession>
      </div>
    </section>
  );
}
