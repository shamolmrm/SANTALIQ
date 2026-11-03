"use client";

import Link from "next/link";
import { useSession } from "@/lib/api";

export function AuthMenu() {
  const { user, loading } = useSession();
  if (loading) return <span className="hidden w-20 sm:block" aria-hidden />;
  if (!user)
    return (
      <Link href="/login" className="rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90">
        Sign in
      </Link>
    );
  return (
    <Link
      href="/account"
      className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm font-medium transition-colors hover:border-fg/30"
      title={user.email}
    >
      <span aria-hidden className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-white">
        {user.display_name.slice(0, 1).toUpperCase()}
      </span>
      <span className="hidden max-w-28 truncate sm:inline">{user.display_name}</span>
    </Link>
  );
}
