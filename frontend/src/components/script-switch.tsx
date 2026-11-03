"use client";

import { SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";

import { tr } from "@/lib/i18n";
/** Compact selector for reading content in any of the five scripts. */
export function ScriptSwitch({
  value,
  original,
  onChange,
}: {
  value: Script;
  original: Script;
  onChange: (s: Script) => void;
}) {
  return (
    <div role="radiogroup" aria-label={tr("Read in script")} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium tracking-wide text-muted uppercase">{tr("Read in")}</span>
      {SCRIPTS.map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={s === value}
          onClick={() => onChange(s)}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            s === value ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"
          }`}
          title={s === original ? tr("Original script") : tr("Converted with draft rules")}
        >
          {SCRIPT_LABELS[s].native}
          {s === original && <span className="ml-1 text-[10px] opacity-70">●</span>}
        </button>
      ))}
    </div>
  );
}
