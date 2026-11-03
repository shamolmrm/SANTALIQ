"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScriptSwitch } from "@/components/script-switch";
import { Alert } from "@/components/ui";
import { api } from "@/lib/api";
import { HERITAGE_LABEL, type HeritageItem } from "@/lib/heritage";
import { Markdown } from "@/lib/markdown";
import { convert, type Script } from "@/lib/script/engine";

import { tr } from "@/lib/i18n";
export function HeritageReader({ slug, initial }: { slug: string; initial: HeritageItem | null }) {
  const [item, setItem] = useState<HeritageItem | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<Script | null>(null);

  // Refresh in the browser: contributors and reviewers can see pending items with their cookie.
  useEffect(() => {
    api<HeritageItem>(`/heritage/items/${encodeURIComponent(slug)}`)
      .then(setItem)
      .catch((e) => setError(e.status === 404 ? tr("This item does not exist or has not been verified yet.") : e.message));
  }, [slug]);

  const shown = script ?? item?.script ?? "olck";
  const view = useMemo(() => {
    if (!item) return null;
    const c = (t: string) => convert(t, item.script, shown, { capitalShortcuts: false });
    return { title: c(item.title), body: c(item.body) };
  }, [item, shown]);

  if (error && !item)
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Alert>{error}</Alert>
        <Link href="/heritage" className="mt-6 inline-block font-semibold text-accent">
          {tr("← SANTALIQ Heritage")}</Link>
      </section>
    );
  if (!item || !view) return <section className="mx-auto max-w-3xl px-4 py-16 text-muted">{tr("Loading…")}</section>;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/heritage" className="text-sm text-muted hover:text-fg">
        {tr("← SANTALIQ Heritage")}</Link>

      {item.status !== "verified" && (
        <div className="mt-6">
          <Alert tone={item.status === "rejected" ? "error" : "info"}>
            {item.status === "rejected"
              ? `${tr("Not accepted by reviewers.")}${item.review_note ? ` ${tr("Note:")} ${item.review_note}` : ""}`
              : tr("Waiting for review. Only you and reviewers can see this.")}
          </Alert>
        </div>
      )}

      <p className="mt-8 text-xs font-semibold tracking-wide text-accent-2 uppercase">{tr(HERITAGE_LABEL[item.kind])}</p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">{view.title}</h1>
      {item.region && <p className="mt-4 text-muted">{item.region}</p>}

      <div className="mt-8 border-y border-line py-4">
        <ScriptSwitch value={shown} original={item.script} onChange={setScript} />
        {shown !== item.script && (
          <p className="mt-2 text-xs text-muted">{tr("Converted automatically with draft rules. The ● script is the original.")}</p>
        )}
      </div>

      <div className={`mt-6 text-lg leading-relaxed sm:text-xl ${item.kind === "song" ? "font-medium" : ""}`}>
        <Markdown source={view.body} />
      </div>

      <dl className="mt-16 grid gap-4 rounded-[var(--radius-card)] border border-line bg-bg-sunken p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">{tr("Source")}</dt>
          <dd className="mt-1 text-muted">{item.source}</dd>
        </div>
        <div>
          <dt className="font-semibold">{tr("Shared by")}</dt>
          <dd className="mt-1 text-muted">
            {item.contributor ? (
              <Link href={`/people/${item.contributor.id}`} className="font-medium text-fg hover:text-accent">
                {item.contributor.display_name}
              </Link>
            ) : (
              tr("A former member")
            )}
            {item.status === "verified" && tr(" · checked by a SANTALIQ reviewer")}
          </dd>
        </div>
      </dl>
    </article>
  );
}
