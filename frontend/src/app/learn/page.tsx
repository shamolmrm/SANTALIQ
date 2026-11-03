import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { PageHeader } from "@/components/ui";
import { Alphabet } from "./alphabet";
import { Quiz } from "./quiz";

import { Tr } from "@/lib/i18n";
export const metadata: Metadata = {
  title: "Learn Ol Chiki",
  description: "Learn the Ol Chiki script for Santali — all 30 letters, digits and marks, with practice quizzes. Free and works offline.",
};

export default function LearnPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <PageHeader
          eyebrow={<Tr s={"SANTALIQ Learn · beta"} />}
          title={<Tr s={"Learn Ol Chiki"} />}
          lead={<Tr s={"Ol Chiki is the script created for Santali by Pandit Raghunath Murmu in 1925. Learn its 30 letters, digits and marks — then practise with quick quizzes."} />}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading eyebrow={<Tr s={"Step 1"} />} title={<Tr s={"The alphabet"} />} />
        <div className="mt-8">
          <Alphabet />
        </div>
      </section>

      <section id="practice" className="scroll-mt-20 border-t border-line bg-bg-sunken">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading eyebrow={<Tr s={"Step 2"} />} title={<Tr s={"Practise"} />} lead={<Tr s={"Ten questions each. Your best score is saved in this browser."} />} />
          <div className="mt-8">
            <Quiz />
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-3">
          {[
            { href: "/tools/keyboard", title: "Step 3 · Type it", body: "Use the Santali keyboard to write Ol Chiki on any device." },
            { href: "/tools/script-converter", title: "See it in other scripts", body: "Convert between Ol Chiki, Roman, Bengali, Odia and Devanagari." },
            { href: "/write", title: "Read real writing", body: "Read Santali articles, poetry and stories in Ol Chiki." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 transition-all hover:-translate-y-0.5 hover:border-accent/40">
              <p className="font-bold">{c.title}</p>
              <p className="mt-2 text-sm text-muted">{c.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
