"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Alert, Button, Textarea } from "@/components/ui";
import { timeAgo } from "@/lib/admin";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";

type Msg = { id: string; body: string; created_at: string; mine: boolean };
type Thread = { user_id: string; name: string; blocked_by_me: boolean; items: Msg[] };

function ThreadView() {
  const { id } = useParams<{ id: string }>();
  const [t, setT] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<Thread>(`/messages/${id}`)
      .then((r) => {
        setT(r);
        requestAnimationFrame(() => end.current?.scrollIntoView({ block: "end" }));
      })
      .catch(() => setError(tr("This member does not exist.")));
  }, [id]);
  useEffect(() => {
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(), 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send() {
    setError(null);
    try {
      await api(`/messages/${id}`, { method: "POST", body: JSON.stringify({ body: text }) });
      setText("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Could not send."));
    }
  }

  async function toggleBlock() {
    if (!t) return;
    if (!t.blocked_by_me && !window.confirm(tr("Block this member? They will not be able to message you."))) return;
    await api(`/messages/${id}/block`, { method: t.blocked_by_me ? "DELETE" : "POST" });
    load();
  }

  if (error && !t) return <Alert>{error}</Alert>;
  if (!t) return <p className="text-muted">{tr("Loading…")}</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/messages" className="text-sm text-muted hover:text-fg">
            ← {tr("Messages")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            <Link href={`/people/${t.user_id}`} className="hover:text-accent">
              {t.name}
            </Link>
          </h1>
        </div>
        <button onClick={toggleBlock} className="text-sm text-muted hover:text-fg">
          {t.blocked_by_me ? tr("Unblock") : tr("Block")}
        </button>
      </div>
      <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-bg-sunken p-4">
        {t.items.length === 0 && <p className="text-sm text-muted">{tr("Say hello!")}</p>}
        {t.items.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.mine ? "bg-fg text-bg" : "bg-bg-elevated"}`}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.mine ? "text-bg/70" : "text-muted"}`}>{timeAgo(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      {!t.blocked_by_me && (
        <div className="mt-4 space-y-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000} placeholder={tr("Write a message…")} />
          <Button onClick={send} disabled={!text.trim()}>
            {tr("Send")}
          </Button>
        </div>
      )}
      <p className="mt-6 text-xs text-muted">{tr("Never share passwords or send money to people you do not know. Report abuse through the contact page.")}</p>
    </div>
  );
}

export default function ThreadPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Suspense fallback={null}>
        <RequireSession>{() => <ThreadView />}</RequireSession>
      </Suspense>
    </section>
  );
}
