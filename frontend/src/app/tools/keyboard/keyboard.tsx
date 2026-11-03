"use client";

import { useEffect, useRef, useState } from "react";
import { convert, SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";
import { keyboardLayout } from "@/lib/script/keyboard";
import { fill, useT } from "@/lib/i18n";

const STORAGE_KEY = "santaliq.keyboard";

export function Keyboard() {
  const [script, setScript] = useState<Script>("olck");
  const [text, setText] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [copied, setCopied] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // Restore draft (per-browser convenience only).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
      if (saved?.text) setText(saved.text);
      if (saved?.script && SCRIPTS.includes(saved.script)) setScript(saved.script);
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ text, script }));
    } catch {
      /* storage unavailable */
    }
  }, [text, script]);

  function insert(chunk: string) {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + chunk + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + chunk.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  function backspace() {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    if (start !== end) return insert("");
    if (start === 0) return;
    const before = Array.from(text.slice(0, start));
    before.pop();
    const head = before.join("");
    setText(head + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(head.length, head.length);
    });
  }

  const tAll = useT();
  const t = tAll.keyboard;
  const preview = phonetic ? convert(phonetic, "latn", script) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-6">
      {/* Script switch */}
      <div role="tablist" aria-label={t.script} className="flex flex-wrap gap-2">
        {SCRIPTS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={s === script}
            onClick={() => setScript(s)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              s === script ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"
            }`}
          >
            {SCRIPT_LABELS[s].name} · {SCRIPT_LABELS[s].native}
          </button>
        ))}
      </div>

      {/* Document */}
      <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-4 sm:p-5">
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={t.placeholder}
          aria-label={t.text}
          className="w-full resize-y rounded-xl border border-line bg-bg p-4 text-2xl leading-relaxed outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted">{fill(t.chars, { n: String(Array.from(text).length) })}</span>
          <div className="flex gap-2">
            <button onClick={() => setText("")} disabled={!text} className="rounded-full border border-line px-4 py-1.5 text-sm disabled:opacity-40">
              {tAll.common.clear}
            </button>
            <button onClick={copy} disabled={!text} className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-40">
              {copied ? tAll.common.copied : tAll.common.copy}
            </button>
          </div>
        </div>
      </div>

      {/* Phonetic typing */}
      {script !== "latn" && (
        <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-4 sm:p-5">
          <label htmlFor="phonetic" className="text-sm font-semibold">
            {t.roman}
          </label>
          <p className="mt-1 text-xs text-muted">
            {t.example} <kbd>santaRi</kbd> → {convert("santaRi", "latn", script)}. {t.romanHelp}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="phonetic"
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && preview) {
                  e.preventDefault();
                  insert(preview + " ");
                  setPhonetic("");
                }
              }}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 rounded-xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                insert(preview + " ");
                setPhonetic("");
              }}
              disabled={!preview}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t.insert} {preview && <span className="ml-1 text-base">{preview}</span>}
            </button>
          </div>
        </div>
      )}

      {/* On-screen keys */}
      <div className="space-y-5 rounded-[var(--radius-card)] border border-line bg-bg-sunken p-4 sm:p-5">
        {keyboardLayout(script).map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.keys.map((k) => (
                <button
                  key={k.char + (k.hint ?? "")}
                  onClick={() => insert(k.char)}
                  title={k.hint}
                  className="flex min-w-11 flex-col items-center rounded-lg border border-line bg-bg-elevated px-2 py-1.5 transition-colors hover:border-accent active:scale-95"
                >
                  <span className="text-xl leading-tight">{k.hint === "◌" ? `◌${k.char}` : k.char}</span>
                  {k.hint && k.hint !== "◌" && <span className="text-[10px] leading-none text-muted">{k.hint}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={() => insert(" ")} className="flex-1 rounded-lg border border-line bg-bg-elevated py-2 text-sm text-muted">
            {t.space}
          </button>
          <button onClick={backspace} className="rounded-lg border border-line bg-bg-elevated px-5 py-2 text-sm" aria-label={t.backspace}>
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
