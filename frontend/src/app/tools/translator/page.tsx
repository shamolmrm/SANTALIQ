import type { Metadata } from "next";
import { Translator } from "@/components/translator";

export const metadata: Metadata = {
  title: "Santali Translator",
  description:
    "Translate between Santali and 50+ languages — English, German, Bengali, Hindi, Odia and more. Santali output shown in Ol Chiki, Roman, Bengali, Odia and Devanagari.",
};

export default function TranslatorPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Beta · machine translation
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          Santali Translator
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Translate between Santali and more than 50 languages — English, German, Bengali, Hindi,
          Odia, Japanese and many more. Santali results appear in all five scripts at once.
        </p>
      </div>

      <div className="mt-12">
        <Translator />
      </div>

      <div className="mt-12 rounded-[var(--radius-card)] border border-line p-6 text-sm leading-relaxed text-muted">
        <p className="font-semibold text-fg">About this translator</p>
        <p className="mt-2">
          Powered by the open NLLB-200 model (Meta AI, CC-BY-NC 4.0) running on SANTALIQ&apos;s own
          server — your text is not sent to third parties. Machine translation for Santali is still
          young: results can be wrong, especially for long or idiomatic sentences. Please check
          important text with a fluent speaker. SANTALIQ will improve quality with verified
          community data.
        </p>
      </div>
    </section>
  );
}
