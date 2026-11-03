"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Input, Select } from "@/components/ui";
import { api, type Role, type User } from "@/lib/api";

/** Admin user management: role and active status. */
export function UsersTable({ me }: { me: User }) {
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
        <p className="text-sm text-muted">{data ? `${data.total} accounts` : ""}</p>
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
