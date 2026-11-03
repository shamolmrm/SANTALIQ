"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";
import { RequireSession } from "@/components/require-session";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <RequireSession role="reviewer">{(me) => <AdminShell me={me}>{children}</AdminShell>}</RequireSession>
    </section>
  );
}
