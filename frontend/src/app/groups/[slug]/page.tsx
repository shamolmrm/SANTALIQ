"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import { timeAgo } from "@/lib/admin";
import { api, useSession } from "@/lib/api";
import { tr } from "@/lib/i18n";
import type { Group } from "@/lib/groups";

type Post = { id: string; body: string; created_at: string; author_id: string; author_name: string; can_delete: boolean };

function GroupView() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useSession();
  const [g, setG] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Group>(`/groups/${slug}`)
      .then(setG)
      .catch(() => setError(tr("This group does not exist.")));
    api<Post[]>(`/groups/${slug}/posts`)
      .then(setPosts)
      .catch(() => setPosts([]));
  }, [slug]);
  useEffect(load, [load, user]);

  async function act(path: string, method = "POST") {
    setError(null);
    try {
      await api(path, { method });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Failed"));
    }
  }

  async function send() {
    setError(null);
    try {
      await api(`/groups/${slug}/posts`, { method: "POST", body: JSON.stringify({ body: text }) });
      setText("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Could not send."));
    }
  }

  if (error && !g) return <Alert>{error}</Alert>;
  if (!g) return <p className="text-muted">{tr("Loading…")}</p>;
  return (
    <div>
      <Link href="/groups" className="text-sm text-muted hover:text-fg">
        ← {tr("Groups")}
      </Link>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">{g.name}</h1>
      <p className="mt-3 text-lg text-muted whitespace-pre-wrap">{g.description}</p>
      <p className="mt-4 text-sm text-muted">
        {g.members} {tr("members")} · {g.posts} {tr("posts")}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {user && !g.i_am_member && <Button onClick={() => act(`/groups/${slug}/join`)}>{tr("Join group")}</Button>}
        {user && g.i_am_member && !g.i_own && (
          <Button variant="secondary" onClick={() => act(`/groups/${slug}/leave`)}>
            {tr("Leave group")}
          </Button>
        )}
        {(g.i_own || user?.role === "admin") && (
          <Button
            variant="danger"
            onClick={async () => {
              if (window.confirm(tr("Delete this group and all its posts?"))) {
                await api(`/groups/${slug}`, { method: "DELETE" });
                router.push("/groups");
              }
            }}
          >
            {tr("Delete group")}
          </Button>
        )}
        {!user && (
          <Link href="/login" className="font-semibold text-accent">
            {tr("Sign in to join")}
          </Link>
        )}
      </div>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {g.i_am_member && (
        <div className="mt-10 space-y-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={5000} placeholder={tr("Write something to the group…")} />
          <Button onClick={send} disabled={!text.trim()}>
            {tr("Post")}
          </Button>
        </div>
      )}
      <ul className="mt-10 space-y-4">
        {posts.map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-bg-elevated p-4">
            <div className="flex justify-between gap-2 text-sm">
              <Link href={`/people/${p.author_id}`} className="font-semibold hover:text-accent">
                {p.author_name}
              </Link>
              <span className="text-xs text-muted">{timeAgo(p.created_at)}</span>
            </div>
            <p className="mt-2 leading-relaxed whitespace-pre-wrap">{p.body}</p>
            {p.can_delete && (
              <button onClick={() => act(`/groups/${slug}/posts/${p.id}`, "DELETE")} className="mt-2 text-xs text-muted hover:text-fg">
                {tr("Remove")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {posts.length === 0 && <p className="mt-6 text-muted">{tr("No posts yet.")}</p>}
    </div>
  );
}

export default function GroupPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Suspense fallback={null}>
        <GroupView />
      </Suspense>
    </section>
  );
}
