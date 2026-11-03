export function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold tracking-wide text-accent">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight sm:text-5xl">{title}</h2>
      {lead && <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}
