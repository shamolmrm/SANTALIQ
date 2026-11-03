"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { hasRole, useSession, type Role, type User } from "@/lib/api";

import { tr } from "@/lib/i18n";
/** Renders children only for a signed-in user with at least `role`. */
export function RequireSession({ role = "member", children }: { role?: Role; children: (user: User) => ReactNode }) {
  const { user, loading } = useSession();
  const pathname = usePathname();

  if (loading) return <p className="text-muted">{tr("Loading…")}</p>;
  if (!user)
    return (
      <Card className="max-w-md">
        <p className="font-semibold">{tr("Please sign in to continue.")}</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="mt-4 inline-flex rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg"
        >
          {tr("Sign in")}</Link>
      </Card>
    );
  if (!hasRole(user, role))
    return (
      <Card className="max-w-md">
        <p className="font-semibold">{tr("You do not have access to this page.")}</p>
        <p className="mt-2 text-sm text-muted">{tr("This area is for")}{" "}{role}{tr("s. Ask an admin if you should have access.")}</p>
      </Card>
    );
  return <>{children(user)}</>;
}
