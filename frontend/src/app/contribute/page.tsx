"use client";

import { RequireSession } from "@/components/require-session";
import { PageHeader } from "@/components/ui";
import { ContributeForm } from "./contribute-form";

import { tr } from "@/lib/i18n";
export default function ContributePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow={tr("Contribute")}
        title={tr("Add a word to the Santali dictionary")}
        lead={tr("Share a word you know. A reviewer checks every entry before it is published, and you are credited as the contributor.")}
      />
      <div className="mt-10">
        <RequireSession>{() => <ContributeForm />}</RequireSession>
      </div>
    </section>
  );
}
