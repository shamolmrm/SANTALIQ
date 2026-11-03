"use client";

import { useCallback, useEffect, useState } from "react";
import { EntryCard } from "@/components/entry-card";
import { RequireSession } from "@/components/require-session";
import { Alert, Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { api, hasRole, type Entry, type Role, type Status, type User } from "@/lib/api";

type Stats = { pending: number; verified: number; rejected: number; users: number };

function StatTile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value ?? "—"}</p>
    </Card>
  );
}

function ReviewQueue({ me, onChange }: { me: User; onChange: () => void }) {
  const [status, setStatus] = useState<Status>("pending");
  const [data, setData] = useState<{ total: number; items: Entry[] } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ total: number; items: Entry[] }>(`/admin/review?status=${status}&limit=50`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function decide(id: string, decision: "verified" | "rejected") {
    setError(null);
    try {
      await api(`/admin/review/${id}`, { method: "POST", body: JSON.stringify({ decision, note: notes[id]?.trim() || null }) });
      load();
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Review queue</h2>
        <div role="tablist" className="flex gap-2">
          {(["pending", "verified", "rejected"] as Status[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize ${status === s ? "bg-fg text-bg" : "border border-line text-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6 grid gap-4">
        {!data && <p className="text-muted">Loading…</p>}
        {data && data.items.length === 0 && <Alert tone="info">Nothing {status} right now.</Alert>}
        {data?.items.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            showStatus
            actions={
              status === "pending" ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Note for the contributor (optional)"
                    value={notes[e.id] ?? ""}
                    onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))}
                    maxLength={2000}
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => decide(e.id, "verified")}>Verify</Button>
                    <Button variant="danger" onClick={() => decide(e.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </div>
              ) : me.role === "admin" ? (
                <Button variant="secondary" onClick={() => decide(e.id, status === "verified" ? "rejected" : "verified")}>
                  Change to {status === "verified" ? "rejected" : "verified"}
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function Users({ me }: { me: User }) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ total: number; items: User[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ total: number; items: User[] }>(`/admin/users?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(id: string, body: Partial<Pick<User, "role" | "is_active">>) {
    setError(null);
    try {
      await api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Users</h2>
        <Input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-bg-elevated">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.items.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.display_name}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  {u.id === me.id ? (
                    <span className="capitalize">{u.role} (you)</span>
                  ) : (
                    <Select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value as Role })} className="py-1.5" aria-label={`Role of ${u.email}`}>
                      <option value="member">Member</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </Select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.id === me.id ? (
                    "Active"
                  ) : (
                    <button onClick={() => patch(u.id, { is_active: !u.is_active })} className={`rounded-full px-3 py-1 text-xs font-medium ${u.is_active ? "bg-accent-soft text-accent" : "bg-red-500/10 text-red-600"}`}>
                      {u.is_active ? "Active — disable" : "Disabled — enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && <p className="p-4 text-muted">Loading…</p>}
      </div>
    </div>
  );
}

function Admin({ me }: { me: User }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const loadStats = useCallback(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => setStats(null));
  }, []);
  useEffect(loadStats, [loadStats]);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Pending review" value={stats?.pending} />
        <StatTile label="Verified entries" value={stats?.verified} />
        <StatTile label="Rejected" value={stats?.rejected} />
        <StatTile label="Registered users" value={stats?.users} />
      </div>
      <ReviewQueue me={me} onChange={loadStats} />
      {hasRole(me, "admin") && <Users me={me} />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader eyebrow="Admin" title="Language data & users" lead="Verify community contributions and manage who can review." />
      <div className="mt-10">
        <RequireSession role="reviewer">{(me) => <Admin me={me} />}</RequireSession>
      </div>
    </section>
  );
}
