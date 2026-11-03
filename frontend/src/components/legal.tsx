import type { ReactNode } from "react";

export const LEGAL_UPDATED = "3 November 2026";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-accent">{eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 rounded-xl border border-line bg-gold-soft p-4 text-sm">
        Draft: this text is under legal review and may change. Material changes will be announced on the site.
      </div>
      <div className="mt-8 text-lg leading-relaxed text-muted">{intro}</div>
      <div className="mt-10 space-y-10">{children}</div>
    </article>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{children}</div>
    </section>
  );
}
