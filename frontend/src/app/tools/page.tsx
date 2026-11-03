import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { StatusBadge } from "@/components/status-badge";
import type { DivisionStatus } from "@/lib/ecosystem";

export const metadata: Metadata = {
  title: "Santali Tools",
  description: "Free Santali language tools: translator, script converter, and more coming soon.",
};

const tools: Array<{ title: string; body: string; status: DivisionStatus; href?: string }> = [
  {
    title: "Translator",
    body: "Santali ↔ 50+ languages, with Santali output in all five scripts.",
    status: "live",
    href: "/tools/translator",
  },
  {
    title: "Script Converter",
    body: "Ol Chiki ↔ Roman ↔ Bengali ↔ Odia ↔ Devanagari, instantly in your browser.",
    status: "live",
    href: "/tools/script-converter",
  },
  {
    title: "Multi-script Keyboard",
    body: "Type Santali directly in any of the five scripts on any device.",
    status: "building",
  },
  {
    title: "Community Dictionary",
    body: "Verified entries contributed by Santali speakers — searchable in every script. Add words you know.",
    status: "live",
    href: "/tools/dictionary",
  },
  {
    title: "Grounded AI Assistant",
    body: "Answers built on verified Santali knowledge, with sources you can check.",
    status: "planned",
  },
  {
    title: "Text-to-Speech",
    body: "Hear Santali read aloud, built from voices shared with consent.",
    status: "planned",
  },
];

export default function ToolsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="SANTALIQ Language"
        title="Santali tools"
        lead="Free tools for reading, writing and translating Santali. Each one is released as soon as it works reliably, and improved with community review."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => {
          const inner = (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{t.title}</h2>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-3 leading-relaxed text-muted">{t.body}</p>
              {t.href && <span className="mt-5 inline-block font-semibold text-accent">Open →</span>}
            </>
          );
          return t.href ? (
            <Link
              key={t.title}
              href={t.href}
              className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
            >
              {inner}
            </Link>
          ) : (
            <div key={t.title} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated/60 p-6">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
