"use client";

import Link from "next/link";
import { tr } from "@/lib/i18n";

export default function OfflinePage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl">ᱥ</p>
      <h1 className="mt-4 text-3xl font-bold">{tr("You are offline.")}</h1>
      <p className="mt-3 text-muted">
        {tr("This page needs the internet. These tools work without it once you have opened them before:")}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/tools/script-converter" className="rounded-full bg-fg px-5 py-2.5 font-semibold text-bg">
          {tr("Script Converter")}
        </Link>
        <Link href="/tools/keyboard" className="rounded-full border border-line px-5 py-2.5 font-semibold">
          {tr("Keyboard")}
        </Link>
        <Link href="/learn" className="rounded-full border border-line px-5 py-2.5 font-semibold">
          {tr("Learn Ol Chiki")}
        </Link>
      </div>
    </section>
  );
}
