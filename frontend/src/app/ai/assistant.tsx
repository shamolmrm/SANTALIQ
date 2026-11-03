"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { api, useSession } from "@/lib/api";
import { convert, detectScript } from "@/lib/script/engine";

import { tr } from "@/lib/i18n";
type Source = { n: number; kind: "dictionary" | "writing"; title: string; url: string; text: string };
type Turn = { role: "user" | "assistant"; content: string; sources?: Source[] };
type Status = { chat_enabled: boolean; model: string | null; daily_limit: number };

/** Ol Chiki form of a Santali question typed in another script, to widen the search. */
function hintFor(text: string): string {
  const s = detectScript(text);
  return s === "olck" || s === "latn" ? "" : convert(text, s, "olck", { capitalShortcuts: false });
}

/** Render answer text with [n] citations as small links to the matching source. */
function Cited({ text, sources }: { text: string; sources?: Source[] }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[(\d+)\]$/);
        const src = m && sources?.find((s) => s.n === Number(m[1]));
        return src ? (
          <a key={i} href={`#src-${src.n}`} className="mx-0.5 rounded bg-accent-soft px-1 text-xs font-semibold text-accent align-super">
            {src.n}
          </a>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <ol className="mt-4 space-y-2">
      {sources.map((s) => (
        <li key={s.n} id={`src-${s.n}`} className="rounded-xl border border-line bg-bg p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded bg-accent-soft text-xs font-bold text-accent">{s.n}</span>
            <Link href={s.url} className="font-semibold hover:text-accent">
              {s.title}
            </Link>
            <span className="text-xs text-muted">{s.kind === "dictionary" ? tr("Verified dictionary") : tr("SANTALIQ Write")}</span>
          </div>
          <p className="mt-1.5 line-clamp-3 text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function Assistant() {
  const { user, loading } = useSession();
  const [status, setStatus] = useState<Status | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Status>("/ai/status").then(setStatus).catch(() => setStatus({ chat_enabled: false, model: null, daily_limit: 0 }));
  }, []);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [turns, busy]);

  const chatMode = !!status?.chat_enabled && !!user;

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    const history = [...turns, { role: "user" as const, content: question }];
    setTurns(history);
    try {
      if (chatMode) {
        const r = await api<{ answer: string; sources: Source[] }>("/ai/chat", {
          method: "POST",
          body: JSON.stringify({
            messages: history.slice(-20).map(({ role, content }) => ({ role, content })),
            search_hint: hintFor(question),
          }),
        });
        setTurns([...history, { role: "assistant", content: r.answer, sources: r.sources }]);
      } else {
        const hint = hintFor(question);
        const sources = await api<Source[]>(`/ai/search?q=${encodeURIComponent(question)}${hint ? `&hint=${encodeURIComponent(hint)}` : ""}`);
        setTurns([
          ...history,
          {
            role: "assistant",
            content: sources.length
              ? `I found ${sources.length} verified SANTALIQ source${sources.length > 1 ? "s" : ""} for this:`
              : "SANTALIQ does not have verified information on this yet. You can help by contributing it.",
            sources,
          },
        ]);
      }
    } catch (e) {
      setTurns(turns);
      setInput(question);
      setError(e instanceof Error ? e.message : tr("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-[var(--radius-card)] border border-line bg-bg-elevated shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3 text-sm">
        <span className="font-semibold">{chatMode ? tr("SANTALIQ AI · chat") : tr("SANTALIQ AI · grounded search")}</span>
        <span className="text-muted">
          {chatMode
            ? `Answers only from verified SANTALIQ sources · ${status?.daily_limit} questions/day`
            : status?.chat_enabled && !loading && !user
              ? tr("Sign in to chat — search works for everyone")
              : tr("Shows verified sources; AI chat is coming soon")}
        </span>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6" aria-live="polite">
        {turns.length === 0 && (
          <div className="mx-auto max-w-lg py-10 text-center">
            <p className="font-display text-2xl font-bold">{tr("Ask about Santali language and culture")}</p>
            <p className="mt-3 text-muted">
              {tr("Every answer is grounded in SANTALIQ's verified dictionary and community writing, with sources you can open. When SANTALIQ doesn't know, it says so.")}</p>
            {!user && status?.chat_enabled && (
              <Link href="/login?next=/ai" className="mt-6 inline-flex rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg">
                {tr("Sign in to chat")}</Link>
            )}
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-fg px-4 py-3 whitespace-pre-wrap text-bg">
              {t.content}
            </div>
          ) : (
            <div key={i} className="max-w-[95%]">
              <div className="leading-relaxed whitespace-pre-wrap">
                <Cited text={t.content} sources={t.sources} />
              </div>
              {t.sources && <SourceList sources={t.sources} />}
              {t.sources?.length === 0 && (
                <Link href="/contribute" className="mt-3 inline-block text-sm font-semibold text-accent">
                  {tr("Contribute to the dictionary →")}</Link>
              )}
            </div>
          ),
        )}
        {busy && <p className="text-muted">{tr("Thinking…")}</p>}
        <div ref={end} />
      </div>

      <div className="border-t border-line p-4">
        {error && <div className="mb-3"><Alert>{error}</Alert></div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={tr("Ask in Santali, Bengali, English, Hindi or Odia…")}
            aria-label={tr("Your question")}
            className="max-h-40 min-h-11 flex-1 resize-y rounded-xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-accent"
          />
          <Button type="submit" disabled={!input.trim() || busy}>
            {chatMode ? tr("Ask") : tr("Search")}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">
          {tr("AI answers can be wrong — check the linked sources. SANTALIQ never invents Santali words or facts.")}</p>
      </div>
    </div>
  );
}
