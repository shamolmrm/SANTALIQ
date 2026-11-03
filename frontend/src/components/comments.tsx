"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import { timeAgo } from "@/lib/admin";
import { api, useSession } from "@/lib/api";
import { tr } from "@/lib/i18n";

type Comment = { id: string; body: string; created_at: string; author_id: string; author_name: string; can_delete: boolean };

/** Comments under a published piece of writing. */
export function Comments({ postId }: { postId: string }) {
  const { user } = useSession();
  const [items, setItems] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Comment[]>(`/write/posts/${postId}/comments`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [postId]);
  useEffect(load, [load, user]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api(`/write/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ body: text }) });
      setText("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Could not send."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(tr("Remove this comment?"))) return;
    await api(`/comments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section id="comments" className="mt-16 scroll-mt-24">
      <h2 className="text-2xl font-bold">
        {tr("Comments")} {items && items.length > 0 && <span className="text-muted">({items.length})</span>}
      </h2>
      <ul className="mt-6 space-y-5">
        {items?.map((c) => (
          <li key={c.id} className="rounded-xl border border-line bg-bg-elevated p-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <Link href={`/people/${c.author_id}`} className="font-semibold hover:text-accent">
                {c.author_name}
              </Link>
              <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
            </div>
            <p className="mt-2 leading-relaxed whitespace-pre-wrap">{c.body}</p>
            {c.can_delete && (
              <button onClick={() => remove(c.id)} className="mt-2 text-xs text-muted hover:text-fg">
                {tr("Remove")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {items?.length === 0 && <p className="mt-4 text-muted">{tr("No comments yet.")}</p>}
      <div className="mt-6">
        {user ? (
          <div className="space-y-3">
            {error && <Alert>{error}</Alert>}
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder={tr("Write a kind, helpful comment…")} />
            <Button onClick={send} disabled={busy || !text.trim()}>
              {busy ? tr("Sending…") : tr("Post comment")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            <Link href="/login" className="font-semibold text-accent">
              {tr("Sign in")}
            </Link>{" "}
            {tr("to join the conversation.")}
          </p>
        )}
      </div>
    </section>
  );
}
