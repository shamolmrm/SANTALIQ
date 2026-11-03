"use client";

import { useEffect, useState } from "react";
import { convert, detectScript, SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";
const SANTALI = "sat_Beng";
const MAX = 2000;

type Language = { code: string; name: string; native: string };

/** Render Santali text in all five scripts, whatever script it arrived in. */
function allScripts(text: string): Array<{ script: Script; text: string }> {
  const src = detectScript(text);
  return SCRIPTS.map((s) => ({ script: s, text: convert(text, src, s) }));
}

export function Translator() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [source, setSource] = useState("eng_Latn");
  const [target, setTarget] = useState(SANTALI);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/translate/languages`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLanguages)
      .catch(() => setError("Could not load languages. Please refresh."));
  }, []);

  async function translate() {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    // Santali input may be typed in any script; the model reads Ol Chiki.
    const payload = source === SANTALI ? convert(text, detectScript(text), "olck") : text;
    try {
      const r = await fetch(`${API}/api/v1/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload, source, target }),
      });
      if (!r.ok) throw new Error(r.status === 503 ? "busy" : r.status === 429 ? "limit" : "failed");
      const data: { translation: string } = await r.json();
      setOutput(data.translation);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "failed";
      setError(
        reason === "busy"
          ? "The translator is starting up or busy. Please try again in a moment."
          : reason === "limit"
            ? "You have sent many translations in a short time. Please wait a minute and try again."
            : "Translation failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setSource(target);
    setTarget(source);
    setInput(output);
    setOutput("");
  }

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        setOutput("");
      }}
      className="w-full rounded-full border border-line bg-bg px-4 py-2 text-sm sm:w-auto"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
          {l.native !== l.name ? ` — ${l.native}` : ""}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Language bar */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {select(source, setSource, "Translate from")}
        <button
          type="button"
          onClick={swap}
          aria-label="Swap languages"
          className="self-center rounded-full border border-line px-3 py-2 text-sm transition-colors hover:border-fg/40"
        >
          ⇄
        </button>
        {select(target, setTarget, "Translate to")}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-5 sm:p-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) translate();
            }}
            rows={8}
            placeholder={
              source === SANTALI
                ? "Write Santali in any script — Ol Chiki, Roman, Bengali, Odia or Devanagari…"
                : "Type text to translate…"
            }
            className="w-full resize-y rounded-xl border border-line bg-bg p-4 text-xl leading-relaxed outline-none focus:border-accent"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {input.length}/{MAX} · Ctrl + Enter
            </span>
            <button
              type="button"
              onClick={translate}
              disabled={loading || !input.trim() || languages.length === 0}
              className="rounded-full bg-fg px-6 py-2.5 font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {loading ? "Translating…" : "Translate"}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-5 sm:p-6" aria-live="polite">
          {error && <p className="rounded-xl bg-accent-soft p-4 text-sm text-accent">{error}</p>}
          {!error && !output && (
            <p className="text-muted">{loading ? "Translating…" : "Your translation will appear here."}</p>
          )}
          {!error && output && target !== SANTALI && (
            <p className="text-2xl leading-relaxed whitespace-pre-wrap">{output}</p>
          )}
          {!error && output && target === SANTALI && (
            <div className="divide-y divide-line">
              {allScripts(output).map(({ script, text }) => (
                <div key={script} className="py-3 first:pt-0 last:pb-0">
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                    {SCRIPT_LABELS[script].name} · {SCRIPT_LABELS[script].native}
                  </span>
                  <p className="mt-1 text-2xl leading-relaxed whitespace-pre-wrap">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
