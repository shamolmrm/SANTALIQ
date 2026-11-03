import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "About",
  description: "SANTALIQ's mission, principles and how it is being built.",
};

const commitments = [
  {
    title: "We never invent language",
    body: "Santali words, translations, grammar and cultural facts on SANTALIQ come from verified sources and native-speaker review — never made up by software. Machine output is always labelled.",
  },
  {
    title: "Consent and credit",
    body: "Voice recordings, writing and cultural knowledge are shared only with permission, and contributors are credited for their work.",
  },
  {
    title: "Every script matters",
    body: "Santali is written in Ol Chiki, Roman, Bengali, Odia and Devanagari. SANTALIQ treats all of them as first-class.",
  },
  {
    title: "Privacy by default",
    body: "Our translator runs on SANTALIQ's own server; your text is not sent to third-party services.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-wide text-accent">About SANTALIQ</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
            A digital home for the Santali language.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            SANTALIQ builds modern technology for Santali speakers — tools to read, write, translate
            and learn the language, and over time a full ecosystem for knowledge, culture and
            community. Our goal is simple: Santali should be as easy to use online as any of the
            world&apos;s major languages.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            We build in small, careful steps. Each module ships only when it works, and language
            features improve through review by the people who speak Santali every day.
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-bg-sunken">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Our commitments" title="How we work." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {commitments.map((c) => (
              <div key={c.title} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6">
                <h2 className="text-lg font-bold">{c.title}</h2>
                <p className="mt-2 leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-xl text-lg">
            Start with what is already live — the translator and the script converter.
          </p>
          <Link
            href="/tools"
            className="rounded-full bg-fg px-6 py-3 font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Explore the tools
          </Link>
        </div>
      </section>
    </>
  );
}
