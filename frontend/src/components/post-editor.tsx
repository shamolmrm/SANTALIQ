"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { Markdown } from "@/lib/markdown";
import { convert, detectScript, SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";
import { KIND_LABEL, KINDS, type Post, type PostKind } from "@/lib/write";

export function PostEditor({ initial }: { initial?: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState<PostKind>(initial?.kind ?? "article");
  const [body, setBody] = useState(initial?.body ?? "");
  const [script, setScript] = useState<Script | "auto">(initial?.script ?? "auto");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [phonetic, setPhonetic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const effectiveScript: Script = script === "auto" ? detectScript(`${title} ${body}`) : script;
  const isPublished = initial?.status === "published";

  function insert(text: string) {
    const el = area.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function wrap(marker: string) {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = body.slice(s, e) || "text";
    setBody(body.slice(0, s) + marker + selected + marker + body.slice(e));
  }

  async function save(publish: boolean) {
    setBusy(true);
    setError(null);
    setSaved(null);
    const payload = { title, kind, body, script: effectiveScript, publish };
    try {
      const post = initial
        ? await api<Post>(`/write/posts/${initial.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api<Post>("/write/posts", { method: "POST", body: JSON.stringify(payload) });
      if (publish) router.push(`/write/${post.slug}`);
      else if (!initial) router.replace(`/write/edit/${post.id}`);
      else setSaved("Draft saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !window.confirm("Delete this piece permanently?")) return;
    await api(`/write/posts/${initial.id}`, { method: "DELETE" });
    router.push("/write/mine");
  }

  const canSave = title.trim() && body.trim() && !busy;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {saved && <Alert tone="success">{saved}</Alert>}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={200}
          aria-label="Title"
          className="border-none bg-transparent px-0 font-display text-3xl font-bold focus:border-none sm:text-4xl"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-2">
          <div className="flex gap-1">
            {(["write", "preview"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-fg text-bg" : "text-muted"}`}>
                {t}
              </button>
            ))}
          </div>
          {tab === "write" && (
            <div className="flex gap-1 text-sm">
              <button onClick={() => wrap("**")} className="rounded px-2 py-1 font-bold hover:bg-bg-sunken" title="Bold">B</button>
              <button onClick={() => wrap("*")} className="rounded px-2 py-1 italic hover:bg-bg-sunken" title="Italic">I</button>
              <button onClick={() => insert("\n\n# ")} className="rounded px-2 py-1 hover:bg-bg-sunken" title="Heading">H</button>
              <button onClick={() => insert("\n\n> ")} className="rounded px-2 py-1 hover:bg-bg-sunken" title="Quote">❝</button>
              <button onClick={() => insert("\n\n- ")} className="rounded px-2 py-1 hover:bg-bg-sunken" title="List">•</button>
            </div>
          )}
        </div>

        {tab === "write" ? (
          <textarea
            ref={area}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            maxLength={100000}
            placeholder={kind === "poetry" ? "Write your poem — line breaks are kept exactly as you type them." : "Start writing…"}
            aria-label="Body"
            className="w-full resize-y rounded-xl border border-line bg-bg-elevated p-5 text-lg leading-relaxed outline-none focus:border-accent"
          />
        ) : (
          <div className="min-h-80 rounded-xl border border-line bg-bg-elevated p-6 text-lg leading-relaxed">
            {body.trim() ? <Markdown source={body} /> : <p className="text-muted">Nothing to preview yet.</p>}
          </div>
        )}

        {effectiveScript !== "latn" && tab === "write" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && phonetic) {
                  e.preventDefault();
                  insert(convert(phonetic, "latn", effectiveScript) + " ");
                  setPhonetic("");
                }
              }}
              placeholder={`Type Roman, press Enter to insert ${SCRIPT_LABELS[effectiveScript].name}`}
              aria-label="Phonetic typing"
              className="flex-1 rounded-xl border border-line bg-bg px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <span className="self-center text-lg">{phonetic && convert(phonetic, "latn", effectiveScript)}</span>
          </div>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
        <Card className="space-y-4">
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {KIND_LABEL[k.value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Written in" hint="Readers can switch to any script; your original is kept.">
            <Select value={script} onChange={(e) => setScript(e.target.value as Script | "auto")}>
              <option value="auto">Detect · {SCRIPT_LABELS[effectiveScript].name}</option>
              {SCRIPTS.map((s) => (
                <option key={s} value={s}>
                  {SCRIPT_LABELS[s].name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => save(true)} disabled={!canSave}>
              {isPublished ? "Update" : "Publish"}
            </Button>
            <Button variant="secondary" onClick={() => save(false)} disabled={!canSave}>
              {isPublished ? "Unpublish (back to draft)" : "Save draft"}
            </Button>
            {initial && (
              <Button variant="danger" onClick={remove}>
                Delete
              </Button>
            )}
          </div>
        </Card>
        <p className="text-xs leading-relaxed text-muted">
          Formatting: <code># Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>&gt; quote</code>, <code>- list</code>. Need special letters?{" "}
          <Link href="/tools/keyboard" target="_blank" className="text-accent">
            Open the keyboard
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
