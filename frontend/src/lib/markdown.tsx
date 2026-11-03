import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown subset for SANTALIQ Write. Produces React elements (never raw HTML).
 * Blocks: "# " / "## " headings, "> " quotes, "- " lists, paragraphs. Single newlines are kept
 * (important for poetry). Inline: **bold**, *italic*.
 */

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? <strong key={i++}>{m[1]}</strong> : <em key={i++}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function withBreaks(text: string): ReactNode[] {
  return text.split("\n").map((line, i, arr) => (
    <Fragment key={i}>
      {inline(line)}
      {i < arr.length - 1 && <br />}
    </Fragment>
  ));
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const b = block.trimEnd();
        if (!b.trim()) return null;
        if (b.startsWith("## ")) return <h3 key={i} className="mt-8 text-xl font-bold">{inline(b.slice(3))}</h3>;
        if (b.startsWith("# ")) return <h2 key={i} className="mt-10 text-2xl font-bold">{inline(b.slice(2))}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith(">")))
          return (
            <blockquote key={i} className="my-6 border-l-4 border-accent-2 pl-5 text-muted italic">
              {withBreaks(lines.map((l) => l.replace(/^>\s?/, "")).join("\n"))}
            </blockquote>
          );
        if (lines.every((l) => /^[-*]\s+/.test(l)))
          return (
            <ul key={i} className="my-5 list-disc space-y-1 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="my-5">
            {withBreaks(b)}
          </p>
        );
      })}
    </>
  );
}
