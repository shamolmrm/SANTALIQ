"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { api, type Entry } from "@/lib/api";
import { convert, detectScript, SCRIPT_LABELS, type Script } from "@/lib/script/engine";

import { tr } from "@/lib/i18n";
type Language = { code: string; name: string; native: string };
type SenseRow = { language: string; gloss: string; example: string };
const OTHER_SCRIPTS: Script[] = ["latn", "beng", "orya", "deva"];
const emptySense = (): SenseRow => ({ language: "eng_Latn", gloss: "", example: "" });

export function ContributeForm() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [rawHeadword, setRawHeadword] = useState("");
  const [spellings, setSpellings] = useState<Record<string, string>>({});
  const [senses, setSenses] = useState<SenseRow[]>([emptySense()]);
  const [pos, setPos] = useState("");
  const [dialect, setDialect] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Entry | null>(null);

  useEffect(() => {
    api<Language[]>("/translate/languages")
      .then((ls) => setLanguages(ls.filter((l) => l.code !== "sat_Beng")))
      .catch(() => setLanguages([{ code: "eng_Latn", name: "English", native: "English" }]));
  }, []);

  const typed = rawHeadword.trim();
  const typedScript = typed ? detectScript(typed) : "olck";
  const headword = typed ? convert(typed, typedScript, "olck") : "";

  function suggestSpellings() {
    const next: Record<string, string> = {};
    for (const s of OTHER_SCRIPTS) next[s] = convert(headword, "olck", s);
    setSpellings(next);
  }

  function updateSense(i: number, patch: Partial<SenseRow>) {
    setSenses((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const entry = await api<Entry>("/dictionary/entries", {
        method: "POST",
        body: JSON.stringify({
          headword,
          part_of_speech: pos.trim() || null,
          dialect: dialect.trim() || null,
          spellings: Object.entries(spellings)
            .filter(([, t]) => t.trim())
            .map(([script, text]) => ({ script, text: text.trim() })),
          senses: senses
            .filter((s) => s.gloss.trim())
            .map((s) => ({ language: s.language, gloss: s.gloss.trim(), example: s.example.trim() || null })),
          source,
          consent,
        }),
      });
      setDone(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Could not submit."));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Card className="max-w-xl">
        <Alert tone="success">
          {tr("Thank you!")}{" "}<strong lang="sat-Olck">{done.headword}</strong> {tr("was submitted and is now waiting for review.")}</Alert>
        <div className="mt-5 flex gap-3">
          <Button
            onClick={() => {
              setDone(null);
              setRawHeadword("");
              setSpellings({});
              setSenses([emptySense()]);
              setPos("");
              setDialect("");
              setConsent(false);
            }}
          >
            {tr("Add another")}</Button>
          <Link href="/account" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">
            {tr("My contributions")}</Link>
        </div>
      </Card>
    );

  const canSubmit = headword && senses.some((s) => s.gloss.trim()) && source.trim().length >= 3 && consent && !busy;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {error && <Alert>{error}</Alert>}

        <Card className="space-y-5">
          <h2 className="text-lg font-bold">{tr("1 · The word")}</h2>
          <Field
            label={tr("Santali word")}
            hint={tr("Type in any script — Ol Chiki, Roman, Bengali, Odia or Devanagari. It is saved in Ol Chiki.")}
          >
            <Input value={rawHeadword} onChange={(e) => setRawHeadword(e.target.value)} maxLength={200} required className="text-2xl" />
          </Field>
          {headword && typedScript !== "olck" && (
            <p className="text-sm">
              {tr("Saved as Ol Chiki:")}{" "}<span className="text-2xl font-semibold" lang="sat-Olck">{headword}</span>{" "}
              <span className="text-muted">{tr("(converted from")}{" "}{SCRIPT_LABELS[typedScript].name} {tr("— please check)")}</span>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Part of speech (optional)")}>
              <Input value={pos} onChange={(e) => setPos(e.target.value)} maxLength={40} placeholder={tr("e.g. noun, verb")} />
            </Field>
            <Field label={tr("Dialect / region (optional)")}>
              <Input value={dialect} onChange={(e) => setDialect(e.target.value)} maxLength={80} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{tr("2 · Spelling in other scripts (optional)")}</h2>
            <Button type="button" variant="secondary" onClick={suggestSpellings} disabled={!headword}>
              {tr("Suggest from converter")}</Button>
          </div>
          <p className="text-sm text-muted">{tr("Suggestions come from draft conversion rules — correct them to how the word is really written.")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {OTHER_SCRIPTS.map((s) => (
              <Field key={s} label={`${SCRIPT_LABELS[s].name} · ${SCRIPT_LABELS[s].native}`}>
                <Input value={spellings[s] ?? ""} onChange={(e) => setSpellings((p) => ({ ...p, [s]: e.target.value }))} maxLength={200} />
              </Field>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">{tr("3 · Meaning")}</h2>
          {senses.map((s, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[180px_1fr]">
              <Select value={s.language} onChange={(e) => updateSense(i, { language: e.target.value })} aria-label={tr("Meaning language")}>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
              <div className="space-y-3">
                <Input value={s.gloss} onChange={(e) => updateSense(i, { gloss: e.target.value })} placeholder={tr("Meaning")} maxLength={2000} aria-label={tr("Meaning")} />
                <Input value={s.example} onChange={(e) => updateSense(i, { example: e.target.value })} placeholder={tr("Example sentence (optional)")} maxLength={2000} aria-label={tr("Example")} />
                {senses.length > 1 && (
                  <button type="button" onClick={() => setSenses((rows) => rows.filter((_, j) => j !== i))} className="text-sm text-muted hover:text-fg">
                    {tr("Remove this meaning")}</button>
                )}
              </div>
            </div>
          ))}
          {senses.length < 20 && (
            <Button type="button" variant="secondary" onClick={() => setSenses((r) => [...r, emptySense()])}>
              {tr("+ Add another meaning")}</Button>
          )}
        </Card>
      </div>

      <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <Card className="space-y-5">
          <h2 className="text-lg font-bold">{tr("4 · Source & consent")}</h2>
          <Field label={tr("Source")} hint={tr("Where does this come from? e.g. your own knowledge as a native speaker, an elder (with permission), or a book with title and page.")}>
            <Textarea value={source} onChange={(e) => setSource(e.target.value)} rows={4} maxLength={1000} required />
          </Field>
          <label className="flex gap-3 text-sm leading-relaxed">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
            <span>{tr("I have the right to share this, and I agree it may be published on SANTALIQ with credit to me after review.")}</span>
          </label>
          <Button type="submit" disabled={!canSubmit} className="w-full py-3">
            {busy ? tr("Submitting…") : tr("Submit for review")}
          </Button>
        </Card>
        <Alert tone="info">{tr("Entries are checked by a reviewer before they appear in the public dictionary.")}</Alert>
      </div>
    </form>
  );
}
