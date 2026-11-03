"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminTitle, Stat, useAdmin } from "@/components/admin/shell";
import { Alert, Card } from "@/components/ui";
import { api, hasRole } from "@/lib/api";
import { type Activity, type SystemInfo, timeAgo } from "@/lib/admin";

function Attention() {
  const { overview: o } = useAdmin();
  if (!o) return null;
  const items = [
    { n: o.dictionary.pending, label: "dictionary entries to review", href: "/admin/review" },
    { n: o.heritage.pending, label: "heritage items to review", href: "/admin/review?tab=heritage" },
    { n: o.voice.pending, label: "voice recordings to review", href: "/admin/review?tab=voice" },
    { n: o.open_reports, label: "reported pieces of writing", href: "/admin/content" },
  ].filter((i) => i.n > 0);
  return (
    <Card>
      <h2 className="font-bold">Needs attention</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">All clear: nothing is waiting for review.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {items.map((i) => (
            <li key={i.label}>
              <Link href={i.href} className="flex items-center gap-3 py-2.5 text-sm hover:text-accent">
                <span className="min-w-8 rounded-full bg-accent-2 px-2 py-0.5 text-center text-xs font-semibold text-white tabular-nums">{i.n}</span>
                <span className="flex-1">{i.label}</span>
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SystemMini() {
  const [s, setS] = useState<SystemInfo | null>(null);
  useEffect(() => {
    api<SystemInfo>("/admin/system").then(setS).catch(() => setS(null));
  }, []);
  if (!s) return null;
  const down = Object.entries(s.checks).filter(([, ok]) => !ok);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">System</h2>
        <Link href="/admin/system" className="text-sm text-accent">
          Details →
        </Link>
      </div>
      <p className={`mt-3 text-sm font-medium ${down.length ? "text-red-600" : "text-accent"}`}>
        {down.length ? `⚠ Down: ${down.map(([k]) => k).join(", ")}` : "● All services running"}
      </p>
      <p className="mt-1 text-sm text-muted">
        Last backup: {s.last_backup_at ? timeAgo(s.last_backup_at) : "not reported yet"}
        {s.disk_free_gb != null && ` · ${s.disk_free_gb} GB free`}
      </p>
    </Card>
  );
}

function RecentActivity() {
  const [items, setItems] = useState<Activity[] | null>(null);
  useEffect(() => {
    api<{ items: Activity[] }>("/admin/activity?limit=8")
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Recent activity</h2>
        <Link href="/admin/activity" className="text-sm text-accent">
          All →
        </Link>
      </div>
      {!items && <p className="mt-3 text-sm text-muted">Loading…</p>}
      <ul className="mt-3 space-y-2 text-sm">
        {items?.map((a) => (
          <li key={a.id} className="flex gap-3">
            <span className="w-20 shrink-0 text-xs text-muted">{timeAgo(a.created_at)}</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{a.actor ?? "system"}</span> <code className="text-xs text-muted">{a.action}</code>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function AdminOverview() {
  const { me, overview: o } = useAdmin();
  const isAdmin = hasRole(me, "admin");
  return (
    <div>
      <AdminTitle title="Overview" lead={`Welcome, ${me.display_name}. Everything on SANTALIQ at a glance.`} />
      {!o && <Alert tone="info">Loading numbers…</Alert>}
      {o && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat label="Waiting for review" value={o.to_review} href="/admin/review" hint="dictionary + heritage + voice + reports" />
            <Stat label="Members" value={o.users_total} href={isAdmin ? "/admin/users" : undefined} hint={`+${o.users_new_7d} this week · ${o.users_active} active`} />
            <Stat label="Published writing" value={o.posts_published} href="/admin/content" hint={`${o.posts_removed} removed · ${o.open_reports} reported`} />
            <Stat label="AI requests (7 days)" value={o.ai_requests_7d} hint={`${o.ai_tokens_7d.toLocaleString()} tokens`} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ["Dictionary", o.dictionary, "verified words", "/tools/dictionary"],
                ["Heritage", o.heritage, "verified items", "/heritage"],
                ["Voice", o.voice, `verified clips · ${o.voice_minutes} min`, "/voice"],
              ] as const
            ).map(([name, c, unit, href]) => (
              <Card key={name}>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{name}</h2>
                  <Link href={href} className="text-xs text-muted hover:text-fg">
                    Public page ↗
                  </Link>
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums">{c.verified}</p>
                <p className="text-xs text-muted">{unit}</p>
                <div className="mt-4 flex gap-4 text-sm">
                  <span>
                    <strong className="tabular-nums">{c.pending}</strong> <span className="text-muted">pending</span>
                  </span>
                  <span>
                    <strong className="tabular-nums">{c.rejected}</strong> <span className="text-muted">rejected</span>
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Attention />
            {isAdmin && <SystemMini />}
          </div>

          {isAdmin && (
            <div className="grid gap-4 lg:grid-cols-2">
              <RecentActivity />
              <Card>
                <h2 className="font-bold">Roles</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {(["admin", "reviewer", "member"] as const).map((r) => (
                    <li key={r} className="flex justify-between">
                      <span className="capitalize">{r}s</span>
                      <span className="font-semibold tabular-nums">{o.users_by_role[r] ?? 0}</span>
                    </li>
                  ))}
                </ul>
                {(o.users_by_role.reviewer ?? 0) === 0 && (
                  <p className="mt-4 rounded-xl bg-gold-soft p-3 text-sm">
                    No reviewers yet. Ask a trusted Santali speaker to register, then make them a reviewer in{" "}
                    <Link href="/admin/users" className="font-semibold text-accent">
                      Users
                    </Link>
                    .
                  </p>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
