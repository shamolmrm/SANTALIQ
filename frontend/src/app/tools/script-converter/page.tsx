import type { Metadata } from "next";
import { ScriptConverter } from "@/components/script-converter";

export const metadata: Metadata = {
  title: "Santali Script Converter",
  description:
    "Convert Santali text between Ol Chiki, Roman, Bengali, Odia and Devanagari instantly — works offline in your browser.",
};

export default function ScriptConverterPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Beta · draft rules under native-speaker review
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          Santali Script Converter
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Write Santali in any script and read it in all five — Ol Chiki, Roman, Bengali, Odia and
          Devanagari. Conversion runs entirely in your browser, so it is instant and works on slow
          connections.
        </p>
      </div>

      <div className="mt-12">
        <ScriptConverter />
      </div>

      <div className="mt-12 rounded-[var(--radius-card)] border border-line p-6 text-sm leading-relaxed text-muted">
        <p className="font-semibold text-fg">About accuracy</p>
        <p className="mt-2">
          This converts <em>script</em>, not meaning — it does not translate. Ol Chiki writes every
          vowel, while Bengali, Odia and Devanagari use an inherent vowel, so some spellings (glottal
          consonants, vowel length, word-final vowels) have more than one accepted form. These rules
          are a draft and are being reviewed by Santali speakers. Spotted a mistake? Tell us — it
          helps everyone.
        </p>
      </div>
    </section>
  );
}
