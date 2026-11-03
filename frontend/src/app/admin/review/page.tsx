"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DictionaryQueue } from "@/components/admin/dictionary-queue";
import { AdminTitle, useAdmin } from "@/components/admin/shell";
import { CareersQueue } from "@/components/careers-queue";
import { ListingsQueue } from "@/components/listings-queue";
import { HeritageQueue } from "@/components/heritage-queue";
import { VoiceQueue } from "@/components/voice-queue";

const TABS = [
  { id: "dictionary", label: "Dictionary" },
  { id: "heritage", label: "Heritage" },
  { id: "voice", label: "Voice" },
  { id: "careers", label: "Careers" },
  { id: "listings", label: "Market · Media · Library" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Review() {
  const { me, overview, refresh } = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab");
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : "dictionary";

  return (
    <div>
      <AdminTitle title="Review" lead="Verify community contributions. You cannot verify your own (admins excepted)." />
      <div role="tablist" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-4">
        {TABS.map((t) => {
          const n = overview?.[t.id].pending ?? 0;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => router.replace(`/admin/review?tab=${t.id}`)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${tab === t.id ? "bg-fg text-bg" : "border border-line text-muted hover:text-fg"}`}
            >
              {t.label}
              {n > 0 && <span className="rounded-full bg-accent-2 px-2 text-xs text-white tabular-nums">{n}</span>}
            </button>
          );
        })}
      </div>
      {tab === "dictionary" && <DictionaryQueue me={me} onChange={refresh} />}
      {tab === "heritage" && <HeritageQueue me={me} onChange={refresh} />}
      {tab === "voice" && <VoiceQueue me={me} onChange={refresh} />}
      {tab === "careers" && <CareersQueue me={me} onChange={refresh} />}
      {tab === "listings" && <ListingsQueue me={me} onChange={refresh} />}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Review />
    </Suspense>
  );
}
