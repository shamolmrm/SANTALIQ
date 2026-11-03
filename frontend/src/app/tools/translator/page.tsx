import type { Metadata } from "next";
import { Translator } from "@/components/translator";
import { T } from "@/lib/i18n";

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
          <T k="translator.badge" />
        </p>
        <h1 className="mt-5 font-display text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
          <T k="translator.title" />
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          <T k="translator.lead" />
        </p>
      </div>

      <div className="mt-12">
        <Translator />
      </div>

      <div className="mt-12 rounded-[var(--radius-card)] border border-line p-6 text-sm leading-relaxed text-muted">
        <p className="font-semibold text-fg"><T k="translator.aboutTitle" /></p>
        <p className="mt-2">
          <T k="translator.aboutBody" />
        </p>
      </div>
    </section>
  );
}
