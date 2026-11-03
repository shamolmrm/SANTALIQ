import type { ReactNode } from "react";
import { EntryStatus } from "@/components/ui";
import type { Entry } from "@/lib/api";
import { SCRIPT_LABELS, type Script } from "@/lib/script/engine";

import { Tr } from "@/lib/i18n";
export function EntryCard({ entry, showStatus = false, actions }: { entry: Entry; showStatus?: boolean; actions?: ReactNode }) {
  const others = entry.spellings.filter((s) => !(s.script === "olck" && s.text === entry.headword));
  return (
    <article className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-3xl font-bold" lang="sat-Olck">
            {entry.headword}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {[entry.part_of_speech, entry.dialect && `dialect: ${entry.dialect}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        {showStatus && entry.status && <EntryStatus status={entry.status} />}
      </div>

      {others.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {others.map((s) => (
            <div key={`${s.script}-${s.text}`} className="flex gap-2">
              <dt className="text-muted">{SCRIPT_LABELS[s.script as Script]?.name ?? s.script}</dt>
              <dd className="font-medium">{s.text}</dd>
            </div>
          ))}
        </dl>
      )}

      <ol className="mt-4 space-y-2">
        {entry.senses.map((s, i) => (
          <li key={i} className="leading-relaxed">
            <span className="mr-2 rounded bg-bg-sunken px-1.5 py-0.5 font-mono text-xs text-muted">{s.language.split("_")[0]}</span>
            {s.gloss}
            {s.example && <span className="block pl-10 text-sm text-muted italic">{s.example}</span>}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-muted">
        <Tr s={"Source:"} />{" "}{entry.source ?? "—"}
        {entry.contributor && <> <Tr s={"· Contributed by"} />{" "}{entry.contributor}</>}
      </p>
      {entry.review_note && <p className="mt-2 text-sm text-muted"><Tr s={"Reviewer note:"} />{" "}{entry.review_note}</p>}
      {actions && <div className="mt-5 border-t border-line pt-5">{actions}</div>}
    </article>
  );
}
