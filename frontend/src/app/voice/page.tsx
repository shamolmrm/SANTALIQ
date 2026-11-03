"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type Recording, VoiceRecorder } from "@/components/voice-recorder";
import { Alert, Button, Card, EntryStatus, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, useSession } from "@/lib/api";
import { detectScript, SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";
import { AGE_RANGES, seconds, type VoiceClip, type VoiceConsent, type VoicePrompt, type VoiceStats } from "@/lib/voice";

const PROMISES = [
  "You decide: public listening and research use are separate choices.",
  "Your voice is never used to clone you or imitate you.",
  "A reviewer checks every recording before anyone else hears it.",
  "Delete one recording, or all your voice data, at any time.",
];

// ── Consent ──

function ConsentForm({ initial, onSaved, onCancel }: { initial: VoiceConsent | null; onSaved: (c: VoiceConsent) => void; onCancel?: () => void }) {
  const [agree, setAgree] = useState(false);
  const [pub, setPub] = useState(initial?.consent_public ?? true);
  const [research, setResearch] = useState(initial?.consent_research ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const c = await api<VoiceConsent>("/voice/consent", {
        method: "PUT",
        body: JSON.stringify({
          agree,
          consent_public: pub,
          consent_research: research,
          dialect: f.get("dialect") || null,
          region: f.get("region") || null,
          age_range: f.get("age_range") || null,
          gender: f.get("gender") || null,
        }),
      });
      onSaved(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-bold">Voice consent</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        SANTALIQ is building a community collection of Santali speech, so that one day Santali can have its own text-to-speech and
        speech recognition, owned by and useful to the community. Please read and choose:
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        {error && <Alert>{error}</Alert>}
        <label className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="mt-1 size-4" />
          <span>
            <strong>Public listening.</strong> After review, other visitors may listen to my recordings on SANTALIQ, shown with my
            display name and dialect.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm">
          <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} className="mt-1 size-4" />
          <span>
            <strong>Research and Santali speech technology.</strong> My verified recordings may be used to research and train
            Santali speech models (such as text-to-speech and speech recognition), and may be shared with researchers for that
            purpose. They must not be used to clone or imitate my individual voice.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dialect (optional)" hint="As you would describe it yourself.">
            <Input name="dialect" defaultValue={initial?.dialect ?? ""} maxLength={80} />
          </Field>
          <Field label="Region (optional)">
            <Input name="region" defaultValue={initial?.region ?? ""} maxLength={120} />
          </Field>
          <Field label="Age range (optional)">
            <Select name="age_range" defaultValue={initial?.age_range ?? ""}>
              <option value="">Prefer not to say</option>
              {AGE_RANGES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gender (optional)" hint="Helps build voices that represent everyone.">
            <Input name="gender" defaultValue={initial?.gender ?? ""} maxLength={24} />
          </Field>
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-accent-soft p-4 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-4" required />
          <span>
            I am the person speaking in my recordings, I am recording voluntarily, and I understand I can change these choices or
            delete all my voice data at any time. If I am under 18, a parent or guardian agrees too.
          </span>
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={!agree || busy}>
            {busy ? "Saving…" : "Save and continue"}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

// ── Recording ──

function RecordPanel({ onUploaded }: { onUploaded: () => void }) {
  const [mode, setMode] = useState<"word" | "own">("word");
  const [script, setScript] = useState<Script>("olck");
  const [prompts, setPrompts] = useState<VoicePrompt[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [own, setOwn] = useState("");
  const [rec, setRec] = useState<Recording | null>(null);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api<VoicePrompt[]>(`/voice/prompts?script=${script}&limit=20`)
      .then((p) => {
        setPrompts(p);
        setIdx(0);
      })
      .catch(() => setPrompts([]));
  }, [script, round]);

  const prompt = mode === "word" ? prompts?.[idx] : undefined;
  const text = mode === "word" ? (prompt?.text ?? "") : own.trim();
  const textScript: Script = mode === "word" ? script : detectScript(own);

  async function submit() {
    if (!rec || !text) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("audio", rec.blob, rec.fileName);
    fd.append("text", text);
    fd.append("script", textScript);
    fd.append("duration_ms", String(Math.round(rec.durationMs)));
    if (prompt) fd.append("lexeme_id", prompt.lexeme_id);
    try {
      const r = await fetch("/api/v1/voice/clips", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(typeof body.detail === "string" ? body.detail : "Upload failed. Please try again.");
      }
      setMsg({ tone: "success", text: "Thank you! Saved for review." });
      setRec(null);
      if (mode === "own") setOwn("");
      setRound((n) => n + 1); // fresh recorder + a new random set of words
      onUploaded();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Record</h2>
        <div role="tablist" className="flex gap-1">
          {(
            [
              ["word", "Read a dictionary word"],
              ["own", "My own sentence"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm ${mode === m ? "bg-fg text-bg" : "border border-line text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "word" ? (
        <div className="space-y-4">
          <Field label="Script">
            <Select value={script} onChange={(e) => setScript(e.target.value as Script)}>
              {SCRIPTS.map((s) => (
                <option key={s} value={s}>
                  {SCRIPT_LABELS[s].name}
                </option>
              ))}
            </Select>
          </Field>
          {!prompts && <p className="text-muted">Loading words…</p>}
          {prompts?.length === 0 && (
            <Alert tone="info">
              There are no verified dictionary words in this script yet, so there is nothing to read. Record your own sentence
              instead, or{" "}
              <Link href="/contribute" className="font-semibold text-accent">
                add words to the dictionary
              </Link>
              .
            </Alert>
          )}
          {prompt && (
            <div className="rounded-2xl border border-line bg-bg-sunken p-8 text-center">
              <p className="text-xs tracking-wide text-muted uppercase">Read aloud</p>
              <p className="mt-3 text-5xl font-bold">{prompt.text}</p>
              <button onClick={() => setIdx((idx + 1) % prompts!.length)} className="mt-4 text-sm text-muted hover:text-fg">
                Skip →
              </button>
            </div>
          )}
        </div>
      ) : (
        <Field label="Type exactly what you will say" hint={own.trim() ? `Script: ${SCRIPT_LABELS[textScript].name}` : "Any script. One short sentence works best."}>
          <Textarea value={own} onChange={(e) => setOwn(e.target.value)} rows={3} maxLength={500} />
        </Field>
      )}

      <VoiceRecorder key={round} onReady={setRec} disabled={!text} />

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Button onClick={submit} disabled={!rec || !text || busy}>
        {busy ? "Uploading…" : "Submit recording"}
      </Button>
    </Card>
  );
}

function MyClips({ refresh }: { refresh: number }) {
  const [clips, setClips] = useState<VoiceClip[] | null>(null);
  const load = useCallback(() => {
    api<VoiceClip[]>("/voice/me/clips")
      .then(setClips)
      .catch(() => setClips([]));
  }, []);
  useEffect(load, [load, refresh]);

  async function remove(id: string) {
    if (!window.confirm("Delete this recording permanently?")) return;
    await api(`/voice/clips/${id}`, { method: "DELETE" });
    load();
  }

  if (!clips) return <p className="text-muted">Loading…</p>;
  if (clips.length === 0) return <p className="text-muted">No recordings yet.</p>;
  return (
    <ul className="grid gap-3">
      {clips.map((c) => (
        <li key={c.id} className="space-y-2 rounded-xl border border-line bg-bg-elevated p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{c.text}</span>
            <EntryStatus status={c.status} />
          </div>
          <audio controls preload="none" src={c.audio_url} className="h-9 w-full" />
          {c.review_note && <p className="text-xs text-muted">Reviewer note: {c.review_note}</p>}
          <button onClick={() => remove(c.id)} className="text-xs text-muted hover:text-fg">
            Delete · {seconds(c.duration_ms)}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Studio() {
  const [consent, setConsent] = useState<VoiceConsent | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api<VoiceConsent | null>("/voice/consent")
      .then(setConsent)
      .catch(() => setConsent(null));
  }, []);

  async function withdrawAll() {
    if (!window.confirm("Delete ALL your recordings and your voice consent? This cannot be undone.")) return;
    await api("/voice/me", { method: "DELETE" });
    setConsent(null);
    setRefresh((n) => n + 1);
  }

  if (consent === undefined) return <p className="text-muted">Loading…</p>;
  if (!consent || editing || consent.consent_version !== consent.current_version)
    return (
      <ConsentForm
        initial={consent}
        onSaved={(c) => {
          setConsent(c);
          setEditing(false);
        }}
        onCancel={consent && editing ? () => setEditing(false) : undefined}
      />
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <RecordPanel onUploaded={() => setRefresh((n) => n + 1)} />
      <div className="space-y-6">
        <Card className="space-y-2 text-sm">
          <h2 className="font-bold">Your choices</h2>
          <p className="text-muted">
            Public listening: <strong className="text-fg">{consent.consent_public ? "yes" : "no"}</strong> · Research use:{" "}
            <strong className="text-fg">{consent.consent_research ? "yes" : "no"}</strong>
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={() => setEditing(true)} className="font-semibold text-accent">
              Change
            </button>
            <button onClick={withdrawAll} className="text-muted hover:text-fg">
              Delete all my voice data
            </button>
          </div>
        </Card>
        <div>
          <h2 className="text-lg font-bold">My recordings</h2>
          <div className="mt-3">
            <MyClips refresh={refresh} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Public ──

function Library() {
  const [clips, setClips] = useState<VoiceClip[] | null>(null);
  useEffect(() => {
    api<VoiceClip[]>("/voice/clips?limit=30")
      .then(setClips)
      .catch(() => setClips([]));
  }, []);
  if (!clips) return <p className="text-muted">Loading…</p>;
  if (clips.length === 0) return <p className="text-muted">No verified public recordings yet. Yours could be the first.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clips.map((c) => (
        <Card key={c.id} className="space-y-3">
          <p className="text-2xl font-bold">{c.text}</p>
          <audio controls preload="none" src={c.audio_url} className="h-9 w-full" />
          <p className="text-xs text-muted">
            <Link href={`/people/${c.speaker.id}`} className="hover:text-fg">
              {c.speaker.display_name}
            </Link>
            {c.dialect && ` · ${c.dialect}`}
          </p>
        </Card>
      ))}
    </div>
  );
}

export default function VoicePage() {
  const { user, loading } = useSession();
  const [stats, setStats] = useState<VoiceStats | null>(null);
  useEffect(() => {
    api<VoiceStats>("/voice/stats").then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow="SANTALIQ Voice · Collection beta"
        title="Lend your voice to Santali."
        lead="Record words and sentences in your own voice. With enough verified recordings from many speakers and dialects, Santali can get its own speech technology, built with consent and owned by the community."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["Verified recordings", stats?.verified_clips],
          ["Minutes of speech", stats?.verified_minutes],
          ["Speakers", stats?.speakers],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-3xl font-bold tabular-nums">{value ?? "—"}</p>
            <p className="text-sm text-muted">{label}</p>
          </Card>
        ))}
      </div>

      <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
        {PROMISES.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="text-accent">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : user ? (
          <Studio />
        ) : (
          <Alert tone="info">
            <Link href="/login?next=/voice" className="font-semibold text-accent">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/register" className="font-semibold text-accent">
              create a free account
            </Link>{" "}
            to record.
          </Alert>
        )}
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold">Listen</h2>
        <p className="mt-1 text-sm text-muted">Verified recordings from speakers who chose public listening.</p>
        <div className="mt-6">
          <Library />
        </div>
      </div>
    </section>
  );
}
