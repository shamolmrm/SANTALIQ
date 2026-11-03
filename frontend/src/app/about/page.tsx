import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { type MessageKey, T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "About",
  description: "SANTALIQ's mission, principles and how it is being built.",
};

const commitments: Array<{ title: MessageKey; body: MessageKey }> = [
  { title: "about.c1Title", body: "about.c1Body" },
  { title: "about.c2Title", body: "about.c2Body" },
  { title: "about.c3Title", body: "about.c3Body" },
  { title: "about.c4Title", body: "about.c4Body" },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-wide text-accent">
            <T k="about.eyebrow" />
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
            <T k="about.title" />
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            <T k="about.p1" />
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            <T k="about.p2" />
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-bg-sunken">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow={<T k="about.commitmentsEyebrow" />} title={<T k="about.commitmentsTitle" />} />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {commitments.map((c) => (
              <div key={c.title} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6">
                <h2 className="text-lg font-bold">
                  <T k={c.title} />
                </h2>
                <p className="mt-2 leading-relaxed text-muted">
                  <T k={c.body} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-xl text-lg">
            <T k="about.ctaText" />
          </p>
          <Link href="/tools" className="rounded-full bg-fg px-6 py-3 font-semibold text-bg transition-opacity hover:opacity-90">
            <T k="about.cta" />
          </Link>
        </div>
      </section>
    </>
  );
}
