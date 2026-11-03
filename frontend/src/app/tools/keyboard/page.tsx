import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Keyboard } from "./keyboard";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Santali Keyboard",
  description: "Type Santali in Ol Chiki, Roman, Bengali, Odia or Devanagari — on-screen keys or Roman phonetic typing.",
};

export default function KeyboardPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow={<T k="keyboard.eyebrow" />}
        title={<T k="keyboard.title" />}
        lead={<T k="keyboard.lead" />}
      />
      <div className="mt-10">
        <Keyboard />
      </div>
    </section>
  );
}
