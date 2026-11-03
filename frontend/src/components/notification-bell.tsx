"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSession } from "@/lib/api";
import { useT } from "@/lib/i18n";

/** Bell with the unread count; polls once a minute while the tab is visible. */
export function NotificationBell() {
  const { user } = useSession();
  const t = useT();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      api<{ unread: number }>("/notifications")
        .then((r) => alive && setUnread(r.unread))
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, 60_000);
    window.addEventListener("santaliq:notifications-read", load);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("santaliq:notifications-read", load);
    };
  }, [user]);

  if (!user) return null;
  return (
    <Link
      href="/notifications"
      aria-label={`${t.common.notifications}${unread ? ` (${unread})` : ""}`}
      className="relative grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-accent-2 px-1 text-center text-[10px] font-bold text-white tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
