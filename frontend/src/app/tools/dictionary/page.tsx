import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DictionarySearch } from "./dictionary-search";

export const metadata: Metadata = {
  title: "Santali Dictionary",
  description: "A community-built, verified Santali dictionary — search in any script.",
};

export default function DictionaryPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow="Beta · community verified"
        title="Santali Dictionary"
        lead="Every entry is contributed by the community and checked by a reviewer before it appears here. Search in any of the five scripts."
      />
      <div className="mt-10">
        <DictionarySearch />
      </div>
    </section>
  );
}
