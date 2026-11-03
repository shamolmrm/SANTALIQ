"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EntryCard } from "@/components/entry-card";
import { Alert, Input } from "@/components/ui";
import { api, type Entry } from "@/lib/api";
import { convert, detectScript } from "@/lib/script/engine";

type Result = { query: string; total: number; results: Entry[] };

export function DictionarySearch() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const t = setTimeout(async () => {
      try {
        setError(null);
        // Search the typed form, and the Ol Chiki form when typed in another script.
        const script = detectScript(term);
        const terms = Array.from(new Set([term, script === "olck" ? term : convert(term, script, "olck")]));
        const results = await Promise.all(terms.map((t) => api<Result>(`/dictionary/search?q=${encodeURIComponent(t)}`)));
        const seen = new Map<string, Entry>();
        results.flatMap((r) => r.results).forEach((e) => seen.set(e.id, e));
        setData({ query: term, total: seen.size, results: [...seen.values()] });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Hide stale results once the box is cleared.
  const shown = q.trim() ? data : null;

  return (
    <div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search in Ol Chiki, Roman, Bengali, Odia or Devanagari…"
        className="py-4 text-xl"
        aria-label="Search the dictionary"
        autoFocus
      />
      <div className="mt-8 grid gap-4" aria-live="polite">
        {error && <Alert>{error}</Alert>}
        {shown && shown.total === 0 && (
          <Alert tone="info">
            No verified entries match “{shown.query}” yet. The dictionary is built word by word by the community —{" "}
            <Link href="/contribute" className="font-semibold text-accent">
              contribute this word →
            </Link>
          </Alert>
        )}
        {shown?.results.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}
