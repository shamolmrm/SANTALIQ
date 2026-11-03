"use client";

import { useMemo, useState } from "react";
import { convert, detectScript, SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";

type From = Script | "auto";

const EXAMPLE = "ᱥᱟᱱᱛᱟᱲᱤ";

export function ScriptConverter() {
  const [input, setInput] = useState(EXAMPLE);
  const [from, setFrom] = useState<From>("auto");
  const [copied, setCopied] = useState<Script | null>(null);

  const source: Script = from === "auto" ? detectScript(input) : from;
  const outputs = useMemo(
    () => SCRIPTS.filter((s) => s !== source).map((s) => ({ script: s, text: convert(input, source, s) })),
    [input, source],
  );

  async function copy(script: Script, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(script);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Input */}
      <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="src" className="text-sm font-semibold">
            Your text
          </label>
          <select
            aria-label="Source script"
            value={from}
            onChange={(e) => setFrom(e.target.value as From)}
            className="rounded-full border border-line bg-bg px-3 py-1.5 text-sm"
          >
            <option value="auto">Detect script{from === "auto" ? ` · ${SCRIPT_LABELS[source].name}` : ""}</option>
            {SCRIPTS.map((s) => (
              <option key={s} value={s}>
                {SCRIPT_LABELS[s].name} — {SCRIPT_LABELS[s].native}
              </option>
            ))}
          </select>
        </div>
        <textarea
          id="src"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder="Type or paste Santali text in any script…"
          className="mt-4 w-full resize-y rounded-xl border border-line bg-bg p-4 text-2xl leading-relaxed outline-none focus:border-accent"
        />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Roman typing: use ṭ ḍ ṇ ṛ ō or the shortcuts <kbd>T</kbd> <kbd>D</kbd> <kbd>N</kbd> <kbd>R</kbd>{" "}
          <kbd>O</kbd>; <kbd>ng</kbd> → ᱝ, <kbd>ny</kbd> → ᱧ, <kbd>kh</kbd> → ᱠᱷ, <kbd>~</kbd> after a vowel →
          nasal.
        </p>
      </div>

      {/* Outputs */}
      <div className="grid gap-3">
        {outputs.map(({ script, text }) => (
          <div key={script} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                {SCRIPT_LABELS[script].name} · {SCRIPT_LABELS[script].native}
              </span>
              <button
                type="button"
                onClick={() => copy(script, text)}
                disabled={!text}
                className="rounded-full border border-line px-3 py-1 text-xs transition-colors hover:border-fg/40 disabled:opacity-40"
              >
                {copied === script ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <p className="mt-2 min-h-[1.5em] break-words text-2xl leading-relaxed" lang={script === "latn" ? "sat-Latn" : undefined}>
              {text || <span className="text-muted">—</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
