"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, hasRole, type User } from "@/lib/api";
import type { Overview } from "@/lib/admin";

type AdminCtx = { me: User; overview: Overview | null; refresh: () => void };
const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin outside AdminShell");
  return v;
}

const NAV: Array<{ href: string; label: string; icon: string; admin?: boolean; badge?: (o: Overview) => number }> = [
  { href: "/admin", label: "Overview", icon: "◧" },
  {
    href: "/admin/review",
    label: "Review",
    icon: "✓",
    badge: (o) => o.dictionary.pending + o.heritage.pending + o.voice.pending + o.careers.pending,
  },
  { href: "/admin/content", label: "Content", icon: "▤", badge: (o) => o.open_reports },
  { href: "/admin/messages", label: "Messages", icon: "✉", admin: true, badge: (o) => o.new_messages },
  { href: "/admin/users", label: "Users", icon: "◉", admin: true },
  { href: "/admin/activity", label: "Activity log", icon: "≡", admin: true },
  { href: "/admin/system", label: "System", icon: "⚙", admin: true, badge: (o) => o.open_errors },
];

export function AdminShell({ me, children }: { me: User; children: ReactNode }) {
  const pathname = usePathname();
  const [overview, setOverview] = useState<Overview | null>(null);
  const refresh = useCallback(() => {
    api<Overview>("/admin/overview")
      .then(setOverview)
      .catch(() => setOverview(null));
  }, []);
  useEffect(refresh, [refresh]);

  const items = NAV.filter((n) => !n.admin || hasRole(me, "admin"));

  return (
    <Ctx.Provider value={{ me, overview, refresh }}>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="hidden px-3 text-xs font-semibold tracking-wide text-muted uppercase lg:block">Admin · {me.role}</p>
          <nav aria-label="Admin" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:mt-3 lg:flex-col lg:px-0 lg:pb-0">
            {items.map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
              const count = overview && n.badge ? n.badge(overview) : 0;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    active ? "bg-fg text-bg" : "text-muted hover:bg-bg-sunken hover:text-fg"
                  }`}
                >
                  <span aria-hidden className="w-4 text-center">
                    {n.icon}
                  </span>
                  <span className="flex-1">{n.label}</span>
                  {count > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${active ? "bg-bg text-fg" : "bg-accent-2 text-white"}`}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Ctx.Provider>
  );
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { me } = useAdmin();
  if (!hasRole(me, "admin")) return <p className="text-muted">This page is for admins.</p>;
  return <>{children}</>;
}

export function AdminTitle({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {lead && <p className="mt-1 text-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value ?? "—"}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-[var(--radius-card)] border border-line bg-bg-elevated p-5 shadow-card";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-accent/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
