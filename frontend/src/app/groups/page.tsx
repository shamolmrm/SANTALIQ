"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { api, useSession } from "@/lib/api";
import type { Group } from "@/lib/groups";
import { tr } from "@/lib/i18n";


function CreateGroup() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const g = await api<Group>("/groups", { method: "POST", body: JSON.stringify({ name: f.get("name"), description: f.get("description") }) });
      router.push(`/groups/${g.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Could not save."));
    }
  }
  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>{tr("Create a group")}</Button>
    );
  return (
    <Card className="w-full">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label={tr("Group name")}>
          <Input name="name" required minLength={3} maxLength={120} />
        </Field>
        <Field label={tr("What is this group about?")}>
          <Textarea name="description" required minLength={10} maxLength={2000} rows={3} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit">{tr("Create")}</Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {tr("Cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function GroupsPage() {
  const { user } = useSession();
  const [groups, setGroups] = useState<Group[] | null>(null);
  useEffect(() => {
    api<Group[]>("/groups")
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [user]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow={tr("SANTALIQ Social")}
        title={tr("Groups")}
        lead={tr("Spaces for villages, schools, writers, teachers and anyone who shares an interest. Be kind; owners and reviewers can remove posts.")}
      />
      <div className="mt-8">{user ? <CreateGroup /> : <Link href="/login" className="font-semibold text-accent">{tr("Sign in to create or join groups")}</Link>}</div>
      <div className="mt-10">
        {!groups && <p className="text-muted">{tr("Loading…")}</p>}
        {groups?.length === 0 && <Alert tone="info">{tr("No groups yet. Start the first one.")}</Alert>}
        <div className="grid gap-4 md:grid-cols-2">
          {groups?.map((g) => (
            <Link key={g.id} href={`/groups/${g.slug}`} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card hover:border-accent/40">
              <h2 className="text-xl font-bold">{g.name}</h2>
              <p className="mt-2 line-clamp-2 text-muted">{g.description}</p>
              <p className="mt-4 text-sm text-muted">
                {g.members} {tr("members")} · {g.posts} {tr("posts")}
                {g.i_am_member && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">{tr("Joined")}</span>}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
