"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSession } from "@/lib/api";
import { tr } from "@/lib/i18n";

type FollowState = { followers: number; following: number; i_follow: boolean };

/** Follower counts and a Follow / Following button for a member's profile. */
export function FollowButton({ userId }: { userId: string }) {
  const { user } = useSession();
  const [s, setS] = useState<FollowState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<FollowState>(`/people/${userId}/follow`)
      .then(setS)
      .catch(() => setS(null));
  }, [userId, user]);

  async function toggle() {
    if (!s) return;
    setBusy(true);
    try {
      setS(await api<FollowState>(`/people/${userId}/follow`, { method: s.i_follow ? "DELETE" : "POST" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {s && (
        <p className="text-sm text-muted">
          <strong className="text-fg tabular-nums">{s.followers}</strong> {tr("followers")} ·{" "}
          <strong className="text-fg tabular-nums">{s.following}</strong> {tr("following")}
        </p>
      )}
      {user && user.id !== userId && s && (
        <button
          onClick={toggle}
          disabled={busy}
          className={`w-full rounded-full px-5 py-2.5 text-sm font-semibold ${s.i_follow ? "border border-line" : "bg-fg text-bg"}`}
        >
          {s.i_follow ? tr("Following ✓") : tr("Follow")}
        </button>
      )}
      {user && user.id !== userId && (
        <Link href={`/messages/${userId}`} className="block rounded-full border border-line px-5 py-2.5 text-center text-sm font-semibold">
          {tr("Send a message")}
        </Link>
      )}
      {!user && (
        <Link href="/login" className="block rounded-full border border-line px-5 py-2.5 text-center text-sm font-semibold">
          {tr("Sign in to follow")}
        </Link>
      )}
    </div>
  );
}
