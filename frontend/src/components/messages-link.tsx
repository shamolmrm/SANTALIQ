"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSession } from "@/lib/api";
import { tr } from "@/lib/i18n";

/** Envelope with the unread private-message count (polls once a minute). */
export function MessagesLink() {
  const { user } = useSession();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () =>
      document.visibilityState === "visible" &&
      api<{ unread: number }>("/messages/unread")
        .then((r) => alive && setUnread(r.unread))
        .catch(() => undefined);
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [user]);
  if (!user) return null;
  return (
    <Link
      href="/messages"
      aria-label={tr("Messages")}
      className="relative hidden size-9 place-items-center rounded-full border border-line text-muted hover:text-fg sm:grid"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-accent-2 px-1 text-center text-[10px] font-bold text-white tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
