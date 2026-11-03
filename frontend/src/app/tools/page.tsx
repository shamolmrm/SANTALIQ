import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { StatusBadge } from "@/components/status-badge";
import type { DivisionStatus } from "@/lib/ecosystem";
import { type MessageKey, T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Santali Tools",
  description: "Free Santali language tools: translator, script converter, and more coming soon.",
};

const tools: Array<{ id: string; title: MessageKey; body: MessageKey; status: DivisionStatus; href?: string }> = [
  { id: "translator", title: "tools.translatorTitle", body: "tools.translatorBody", status: "live", href: "/tools/translator" },
  { id: "converter", title: "tools.converterTitle", body: "tools.converterBody", status: "live", href: "/tools/script-converter" },
  { id: "keyboard", title: "tools.keyboardTitle", body: "tools.keyboardBody", status: "live", href: "/tools/keyboard" },
  { id: "dictionary", title: "tools.dictionaryTitle", body: "tools.dictionaryBody", status: "live", href: "/tools/dictionary" },
  { id: "ai", title: "tools.aiTitle", body: "tools.aiBody", status: "live", href: "/ai" },
  { id: "tts", title: "tools.ttsTitle", body: "tools.ttsBody", status: "planned" },
];

export default function ToolsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow={<T k="tools.eyebrow" />}
        title={<T k="tools.title" />}
        lead={<T k="tools.lead" />}
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => {
          const inner = (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold"><T k={t.title} /></h2>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-3 leading-relaxed text-muted"><T k={t.body} /></p>
              {t.href && <span className="mt-5 inline-block font-semibold text-accent"><T k="common.open" /></span>}
            </>
          );
          return t.href ? (
            <Link
              key={t.id}
              href={t.href}
              className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
            >
              {inner}
            </Link>
          ) : (
            <div key={t.id} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated/60 p-6">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
