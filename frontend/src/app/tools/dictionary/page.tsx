import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DictionarySearch } from "./dictionary-search";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Santali Dictionary",
  description: "A community-built, verified Santali dictionary — search in any script.",
};

export default function DictionaryPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow={<T k="dictionary.eyebrow" />}
        title={<T k="dictionary.title" />}
        lead={<T k="dictionary.lead" />}
      />
      <div className="mt-10">
        <DictionarySearch />
      </div>
    </section>
  );
}
