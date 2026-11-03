"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChangePassword, EmailVerification, ProfileEditor } from "@/components/account-security";
import { EntryCard } from "@/components/entry-card";
import { RequireSession } from "@/components/require-session";
import { Alert, Button, Card, PageHeader } from "@/components/ui";
import { api, hasRole, notifyAuthChanged, type Entry, type User } from "@/lib/api";

function MyEntries() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Entry[]>("/dictionary/entries/mine")
      .then(setEntries)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!entries) return <p className="text-muted">Loading your contributions…</p>;
  if (entries.length === 0)
    return (
      <Alert tone="info">
        You have not contributed any entries yet.{" "}
        <Link href="/contribute" className="font-semibold text-accent">
          Add your first word →
        </Link>
      </Alert>
    );
  return (
    <div className="grid gap-4">
      {entries.map((e) => (
        <EntryCard key={e.id} entry={e} showStatus />
      ))}
    </div>
  );
}

function Account({ user }: { user: User }) {
  const router = useRouter();
  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    notifyAuthChanged();
    router.push("/");
  }
  return (
    <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit space-y-4">
        <div>
          <p className="text-xl font-bold">{user.display_name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <p className="text-sm">
          Role: <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-medium text-accent capitalize">{user.role}</span>
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/contribute" className="rounded-full bg-fg px-5 py-2.5 text-center text-sm font-semibold text-bg">
            Contribute a word
          </Link>
          <Link href="/write/mine" className="rounded-full border border-line px-5 py-2.5 text-center text-sm font-semibold">
            My writing
          </Link>
          {hasRole(user, "reviewer") && (
            <Link href="/admin" className="rounded-full border border-line px-5 py-2.5 text-center text-sm font-semibold">
              Admin & review
            </Link>
          )}
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      </Card>
      <div className="space-y-10">
        <EmailVerification user={user} />
        <div>
        <h2 className="text-2xl font-bold">My contributions</h2>
        <p className="mt-1 text-sm text-muted">
          New entries are <strong>pending</strong> until a reviewer checks them. Only verified entries appear in the public dictionary.
        </p>
        <div className="mt-6">
          <MyEntries />
        </div>
        </div>
        <ProfileEditor user={user} />
        <ChangePassword />
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader eyebrow="Account" title="Your SANTALIQ" />
      <div className="mt-10">
        <RequireSession>{(user) => <Account user={user} />}</RequireSession>
      </div>
    </section>
  );
}
