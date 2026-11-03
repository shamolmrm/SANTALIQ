import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Assistant } from "./assistant";

import { Tr } from "@/lib/i18n";
export const metadata: Metadata = {
  title: "SANTALIQ AI",
  description: "Ask about the Santali language and culture — answers grounded in verified SANTALIQ sources, with citations.",
};

export default function AIPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow={<Tr s={"Beta · grounded AI"} />}
        title={<Tr s={"SANTALIQ AI"} />}
        lead={<Tr s={"An assistant that answers from verified Santali knowledge — the community dictionary and SANTALIQ Write — and shows its sources."} />}
      />
      <div className="mt-10">
        <Assistant />
      </div>
    </section>
  );
}
