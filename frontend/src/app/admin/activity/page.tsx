"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminOnly, AdminTitle } from "@/components/admin/shell";
import { Alert, Button, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { ACTION_GROUPS, type Activity, timeAgo } from "@/lib/admin";

const PAGE = 50;

function Log() {
  const [group, setGroup] = useState("");
  const [items, setItems] = useState<Activity[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (group) p.set("action", group);
    api<{ total: number; items: Activity[] }>(`/admin/activity?${p}`)
      .then((r) => {
        setTotal(r.total);
        setItems((prev) => (offset === 0 ? r.items : [...prev, ...r.items]));
      })
      .catch((e) => setError(e.message));
  }, [group, offset]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setOffset(0);
          }}
          aria-label="Filter"
          className="max-w-xs py-2"
        >
          {ACTION_GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
        {total != null && <span className="text-sm text-muted">{total} events</span>}
      </div>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-bg-elevated">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted" title={new Date(a.created_at).toLocaleString()}>
                  {timeAgo(a.created_at)}
                </td>
                <td className="px-4 py-2.5">
                  {a.actor_id ? (
                    <Link href={`/people/${a.actor_id}`} className="hover:text-accent">
                      {a.actor}
                    </Link>
                  ) : (
                    <span className="text-muted">system / deleted user</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <code className="rounded bg-bg-sunken px-1.5 py-0.5 text-xs">{a.action}</code>
                </td>
                <td className="max-w-md px-4 py-2.5 text-xs break-words text-muted">
                  {a.target_type && `${a.target_type} `}
                  {a.detail && Object.keys(a.detail).length > 0 && JSON.stringify(a.detail)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total === 0 && <p className="p-4 text-muted">No events.</p>}
      </div>
      {total != null && items.length < total && (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setOffset(items.length)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ActivityPage() {
  return (
    <AdminOnly>
      <AdminTitle title="Activity log" lead="Every important action: sign-ups, reviews, moderation, role changes, withdrawals. IP addresses are not shown." />
      <Log />
    </AdminOnly>
  );
}
