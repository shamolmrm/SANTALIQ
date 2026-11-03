import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Keyboard } from "./keyboard";

export const metadata: Metadata = {
  title: "Santali Keyboard",
  description: "Type Santali in Ol Chiki, Roman, Bengali, Odia or Devanagari — on-screen keys or Roman phonetic typing.",
};

export default function KeyboardPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow="Beta · works offline"
        title="Santali Keyboard"
        lead="Type Santali in any of its five scripts — tap the on-screen keys, or type with Roman letters and insert the result. Nothing to install."
      />
      <div className="mt-10">
        <Keyboard />
      </div>
    </section>
  );
}
