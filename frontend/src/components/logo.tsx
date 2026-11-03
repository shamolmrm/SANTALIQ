import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="SANTALIQ home">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-fg font-[family-name:var(--font-olchiki)] text-lg text-bg transition-transform group-hover:-rotate-6"
      >
        ᱥ
      </span>
      <span className="text-lg font-extrabold tracking-[0.08em]">
        SANTAL<span className="text-accent">IQ</span>
      </span>
    </Link>
  );
}
