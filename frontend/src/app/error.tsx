"use client";

import Link from "next/link";
import { useEffect } from "react";
import { tr } from "@/lib/i18n";
import { reportError } from "@/lib/report-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-accent-2">!</p>
      <h1 className="mt-4 text-3xl font-bold">{tr("Something went wrong on this page.")}</h1>
      <p className="mt-3 text-muted">{tr("We have been notified and will look into it. Please try again.")}</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-fg px-6 py-3 font-semibold text-bg">
          {tr("Try again")}
        </button>
        <Link href="/" className="rounded-full border border-line px-6 py-3 font-semibold">
          {tr("Home")}
        </Link>
      </div>
    </section>
  );
}
