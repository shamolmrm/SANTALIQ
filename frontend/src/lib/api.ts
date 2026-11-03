"use client";

import { useCallback, useEffect, useState } from "react";

export type Role = "member" | "reviewer" | "admin";
export type User = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  is_active: boolean;
  email_verified?: boolean;
  created_at?: string;
};
export type Status = "draft" | "pending" | "verified" | "rejected";
export type Entry = {
  id: string;
  headword: string;
  part_of_speech: string | null;
  dialect: string | null;
  source: string | null;
  contributor: string | null;
  spellings: Array<{ script: string; text: string }>;
  senses: Array<{ language: string; gloss: string; example: string | null }>;
  status?: Status;
  review_note?: string | null;
  created_at?: string | null;
};

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** JSON fetch against the SANTALIQ API with the session cookie. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!r.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await r.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = String(body.detail[0].msg).replace(/^Value error, /, "");
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(r.status, message);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}

const AUTH_EVENT = "santaliq:auth";
export const notifyAuthChanged = () => window.dispatchEvent(new Event(AUTH_EVENT));

/** Current signed-in user (null when signed out). Re-fetches on login/logout. */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(AUTH_EVENT, refresh);
    return () => window.removeEventListener(AUTH_EVENT, refresh);
  }, [refresh]);

  return { user, loading, refresh };
}

export const ROLE_RANK: Record<Role, number> = { member: 0, reviewer: 1, admin: 2 };
export const hasRole = (user: User | null, role: Role) => !!user && ROLE_RANK[user.role] >= ROLE_RANK[role];
