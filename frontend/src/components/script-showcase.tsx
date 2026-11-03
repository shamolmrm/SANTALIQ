"use client";

import { useEffect, useState } from "react";

/** The name of the language as commonly written in each script. */
const scripts = [
  { id: "olck", label: "Ol Chiki", text: "ᱥᱟᱱᱛᱟᱲᱤ", lang: "sat-Olck" },
  { id: "beng", label: "বাংলা", text: "সাঁওতালি", lang: "bn" },
  { id: "deva", label: "देवनागरी", text: "संथाली", lang: "hi" },
  { id: "orya", label: "ଓଡ଼ିଆ", text: "ସାନ୍ତାଳି", lang: "or" },
  { id: "latn", label: "Roman", text: "Santali", lang: "en" },
] as const;

export function ScriptShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((i) => (i + 1) % scripts.length), 2400);
    return () => clearInterval(id);
  }, [paused]);

  const current = scripts[active];

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] sm:p-8">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
        <span>Universal Script Switch</span>
        <span className="rounded-full bg-accent-soft px-2 py-1 text-accent normal-case tracking-normal">
          Preview
        </span>
      </div>

      <div
        key={current.id}
        lang={current.lang}
        className="mt-8 min-h-[1.4em] animate-[fadeUp_.5s_ease] text-5xl font-bold sm:text-6xl"
        aria-live="polite"
      >
        {current.text}
      </div>

      <div role="tablist" aria-label="Choose script" className="mt-8 flex flex-wrap gap-2">
        {scripts.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              i === active
                ? "border-fg bg-fg text-bg"
                : "border-line text-muted hover:border-fg/40 hover:text-fg"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
