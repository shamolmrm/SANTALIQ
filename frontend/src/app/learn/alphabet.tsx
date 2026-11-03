"use client";

import { useState } from "react";
import { DIGITS, LETTERS, MARKS, type Letter } from "@/lib/learn/olchiki";
import { convert, SCRIPT_LABELS, type Script } from "@/lib/script/engine";

const OTHER: Script[] = ["latn", "beng", "orya", "deva"];

function LetterDetail({ letter }: { letter: Letter }) {
  // Show consonants with the vowel ᱟ so the syllable is readable in abugida scripts.
  const sample = letter.vowel || letter.name === "OH" ? letter.char : letter.char + "ᱟ";
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card lg:sticky lg:top-24">
      <div className="flex items-start gap-6">
        <span className="font-[family-name:var(--font-olchiki)] text-8xl leading-none" lang="sat-Olck">
          {letter.char}
        </span>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{letter.vowel ? "Vowel" : "Consonant"}</p>
          <p className="mt-1 text-2xl font-bold">{letter.name}</p>
          <p className="mt-1 text-muted">
            Sound: <span className="font-semibold text-fg">{letter.roman}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            U+{letter.char.codePointAt(0)!.toString(16).toUpperCase()} · row {letter.row + 1}
          </p>
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {sample === letter.char ? "In other scripts" : `“${sample}” in other scripts`}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {OTHER.map((s) => (
            <div key={s} className="rounded-xl bg-bg-sunken px-3 py-2">
              <dt className="text-xs text-muted">{SCRIPT_LABELS[s].name}</dt>
              <dd className="text-2xl">{convert(sample, "olck", s)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function Alphabet() {
  const [selected, setSelected] = useState<Letter>(LETTERS[0]);
  const rows = Array.from({ length: 6 }, (_, r) => LETTERS.filter((l) => l.row === r));

  return (
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="mb-4 text-sm text-muted">30 letters in six rows — each row begins with a vowel. Tap a letter.</p>
          <div className="space-y-2">
            {rows.map((row, r) => (
              <div key={r} className="grid grid-cols-5 gap-2">
                {row.map((l) => (
                  <button
                    key={l.char}
                    onClick={() => setSelected(l)}
                    aria-pressed={selected.char === l.char}
                    className={`flex flex-col items-center rounded-xl border py-3 transition-all hover:-translate-y-0.5 ${
                      selected.char === l.char
                        ? "border-accent bg-accent-soft"
                        : l.vowel
                          ? "border-accent-2/40 bg-gold-soft"
                          : "border-line bg-bg-elevated"
                    }`}
                  >
                    <span className="font-[family-name:var(--font-olchiki)] text-4xl leading-tight" lang="sat-Olck">
                      {l.char}
                    </span>
                    <span className="mt-1 text-xs text-muted">{l.roman.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            <span className="mr-1 inline-block size-2.5 rounded-sm bg-gold-soft align-middle ring-1 ring-accent-2/40" /> vowels ·
            sounds use SANTALIQ&apos;s draft romanization, under native-speaker review.
          </p>
        </div>
        <LetterDetail letter={selected} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-xl font-bold">Digits</h3>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {DIGITS.map((d) => (
              <div key={d.char} className="flex flex-col items-center rounded-xl border border-line bg-bg-elevated py-3">
                <span className="font-[family-name:var(--font-olchiki)] text-3xl">{d.char}</span>
                <span className="text-xs text-muted">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold">Marks & punctuation</h3>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {MARKS.map((m) => (
              <li key={m.char} className="flex items-center gap-3 rounded-xl border border-line bg-bg-elevated px-3 py-2">
                <span className="w-8 text-center font-[family-name:var(--font-olchiki)] text-3xl">◌{m.char}</span>
                <span className="text-xs leading-tight">
                  <span className="font-semibold">{m.name}</span>
                  <span className="block text-muted">{m.use}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
