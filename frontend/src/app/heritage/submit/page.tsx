"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Alert, Button, Card, EntryStatus, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { HERITAGE_KINDS, HERITAGE_LABEL, type HeritageItem, type HeritageKind } from "@/lib/heritage";
import { detectScript, SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";

import { tr } from "@/lib/i18n";
const GUIDELINES = [
  "Share only what you have the right to share: your own knowledge, or something an elder or community member agreed to share publicly.",
  "Do not share sacred, secret or ritual knowledge that the community keeps private.",
  "Name your source: who told it, where it was recorded, or which book it comes from.",
  "Write it as it was told. Do not add things you are not sure about. A reviewer will check it before it is public.",
];

function MySubmissions({ refresh }: { refresh: number }) {
  const [items, setItems] = useState<HeritageItem[] | null>(null);
  const load = useCallback(() => {
    api<HeritageItem[]>("/heritage/me/items")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load, refresh]);

  async function withdraw(id: string) {
    if (!window.confirm(tr("Withdraw this item? It will be deleted from SANTALIQ."))) return;
    await api(`/heritage/items/${id}`, { method: "DELETE" });
    load();
  }

  if (!items) return <p className="text-muted">{tr("Loading…")}</p>;
  if (items.length === 0) return <p className="text-muted">{tr("You have not shared anything yet.")}</p>;
  return (
    <ul className="grid gap-3">
      {items.map((i) => (
        <li key={i.id} className="rounded-xl border border-line bg-bg-elevated p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/heritage/${i.slug}`} className="font-semibold hover:text-accent">
              {i.title}
            </Link>
            <EntryStatus status={i.status} />
          </div>
          <p className="mt-1 text-xs text-muted">{tr(HERITAGE_LABEL[i.kind])}</p>
          {i.review_note && <p className="mt-2 text-sm text-muted">{tr("Reviewer note:")}{" "}{i.review_note}</p>}
          <button onClick={() => withdraw(i.id)} className="mt-2 text-xs text-muted hover:text-fg">
            {tr("Withdraw")}</button>
        </li>
      ))}
    </ul>
  );
}

function SubmitForm({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<HeritageKind>("folk_story");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [region, setRegion] = useState("");
  const [source, setSource] = useState("");
  const [script, setScript] = useState<Script | "auto">("auto");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const effective: Script = script === "auto" ? detectScript(`${title} ${body}`) : script;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/heritage/items", {
        method: "POST",
        body: JSON.stringify({ kind, title, body, region: region || null, source, script: effective, consent }),
      });
      setTitle("");
      setBody("");
      setRegion("");
      setSource("");
      setConsent(false);
      setMsg({ tone: "success", text: tr("Thank you! A reviewer will check it before it appears in the archive.") });
      onDone();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : tr("Could not submit.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={tr("Kind")} hint={tr(HERITAGE_KINDS.find((k) => k.value === kind)?.hint ?? "")}>
          <Select value={kind} onChange={(e) => setKind(e.target.value as HeritageKind)}>
            {HERITAGE_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {tr(k.label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Script")} hint={script === "auto" ? `Detected: ${SCRIPT_LABELS[effective].name}` : undefined}>
          <Select value={script} onChange={(e) => setScript(e.target.value as Script | "auto")}>
            <option value="auto">{tr("Detect automatically")}</option>
            {SCRIPTS.map((s) => (
              <option key={s} value={s}>
                {SCRIPT_LABELS[s].name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={tr("Title")}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </Field>
      <Field label={tr("Text")} hint={tr("Write it as it was told. Line breaks are kept; **bold** and *italic* work.")}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={20} maxLength={100000} rows={14} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={tr("Region (optional)")} hint={tr("Village, district or area it comes from.")}>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={120} />
        </Field>
        <Field label={tr("Source")} hint={tr("Who told it, where it was recorded, or the book it comes from.")}>
          <Input value={source} onChange={(e) => setSource(e.target.value)} required minLength={3} maxLength={500} />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
        <span>
          {tr("I have permission to share this publicly, it is not secret or sacred knowledge kept private by the community, and I agree that SANTALIQ may publish it with credit to me and the source. I can withdraw it at any time.")}</span>
      </label>
      <Button type="submit" disabled={busy || !consent}>
        {busy ? tr("Sending…") : tr("Send for review")}
      </Button>
    </form>
  );
}

export default function HeritageSubmitPage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow={tr("SANTALIQ Heritage")}
        title={tr("Share a story, song or memory")}
        lead={tr("Help preserve Santali culture for the next generations. Everything is checked by a reviewer before it is published.")}
      />
      <div className="mt-10">
        <RequireSession>
          {() => (
            <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
              <Card>
                <SubmitForm onDone={() => setRefresh((n) => n + 1)} />
              </Card>
              <div className="space-y-8">
                <Card className="space-y-3">
                  <h2 className="font-bold">{tr("Before you share")}</h2>
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                    {GUIDELINES.map((g) => (
                      <li key={g}>{tr(g)}</li>
                    ))}
                  </ul>
                </Card>
                <div>
                  <h2 className="text-lg font-bold">{tr("My submissions")}</h2>
                  <div className="mt-4">
                    <MySubmissions refresh={refresh} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </RequireSession>
      </div>
    </section>
  );
}
