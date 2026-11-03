import Link from "next/link";
import { ScriptShowcase } from "@/components/script-showcase";
import { SectionHeading } from "@/components/section-heading";
import { StatusBadge } from "@/components/status-badge";
import { divisions } from "@/lib/ecosystem";

const liveTools = [
  {
    title: "Translator",
    body: "Translate between Santali and 50+ languages — English, German, Bengali, Hindi, Odia and more. Santali results appear in all five scripts.",
    href: "/tools/translator",
    cta: "Open translator",
  },
  {
    title: "Script Converter",
    body: "Move Santali text between Ol Chiki, Roman, Bengali, Odia and Devanagari — instantly, in your browser, even on slow internet.",
    href: "/tools/script-converter",
    cta: "Open converter",
  },
];

const principles = [
  { title: "Santali first", body: "Every feature is designed for Santali speakers before anyone else." },
  {
    title: "Verified data",
    body: "Community contributions are reviewed before they are published or used to train AI.",
  },
  {
    title: "Community owned",
    body: "Language, voice and cultural knowledge are shared with consent and always credited.",
  },
  { title: "Works on slow internet", body: "Light, fast pages built for village networks and city broadband alike." },
];

const roadmap = [
  { phase: "01", title: "Language tools — translator, converter, keyboard, dictionary", status: "Live" },
  { phase: "02", title: "Verified language data & SANTALIQ Write", status: "Live" },
  { phase: "03", title: "Grounded Santali AI", status: "Beta" },
  { phase: "04", title: "Santali voice", status: "Next" },
  { phase: "05", title: "Learning & heritage", status: "Planned" },
  { phase: "06", title: "Community, mobile & global", status: "Planned" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pattern-lattice pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 h-[560px] w-[1000px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(40% 50% at 30% 50%, var(--accent-soft), transparent 70%), radial-gradient(35% 45% at 72% 40%, var(--gold-soft), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-28 lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-elevated/60 px-3 py-1 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              Translator, dictionary, Write and AI are live
            </p>
            <h1 className="mt-6 font-display text-[2.75rem] leading-[1.02] font-extrabold tracking-tight sm:text-7xl">
              Santali Language.
              <br />
              <span className="text-gradient">AI Innovation.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              SANTALIQ is a digital home for the Santali language, people and culture — tools,
              knowledge and community, in every script Santali is written in.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/tools/translator"
                className="rounded-full bg-fg px-6 py-3 font-semibold text-bg shadow-card transition-opacity hover:opacity-90"
              >
                Start translating
              </Link>
              <Link
                href="/tools/script-converter"
                className="rounded-full border border-line bg-bg-elevated px-6 py-3 font-semibold transition-colors hover:border-fg/30"
              >
                Convert scripts
              </Link>
            </div>
          </div>
          <ScriptShowcase />
        </div>
      </section>

      {/* Live tools */}
      <section id="tools" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Available now"
            title="Tools you can use today."
            lead="Free, fast and built for Santali. More tools join as each one is verified with the community."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {liveTools.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group rounded-[var(--radius-card)] border border-line bg-bg-elevated p-7 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{t.title}</h3>
                  <StatusBadge status="live" />
                </div>
                <p className="mt-3 leading-relaxed text-muted">{t.body}</p>
                <span className="mt-6 inline-flex items-center gap-1 font-semibold text-accent">
                  {t.cta} <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section id="ecosystem" className="scroll-mt-20 border-t border-line bg-bg-sunken">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="The SANTALIQ ecosystem"
            title="One account. One home. Fifteen ways to connect."
            lead="SANTALIQ grows one verified module at a time. Here is where each part stands today."
          />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((d) => {
              const body = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">
                      <span className="text-muted">SANTALIQ </span>
                      {d.name}
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d.summary}</p>
                </>
              );
              return (
                <li key={d.name} className="bg-bg-elevated">
                  {d.href ? (
                    <Link href={d.href} className="block h-full p-6 transition-colors hover:bg-bg">
                      {body}
                    </Link>
                  ) : (
                    <div className="h-full p-6">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Principles */}
      <section id="principles" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Our principles" title="Built with the community, not just for it." />
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <div key={p.title}>
                <div className="font-display text-4xl font-bold text-accent-2">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Roadmap" title="One step at a time, done properly." />
          <ol className="mt-12 divide-y divide-line border-y border-line">
            {roadmap.map((r) => (
              <li key={r.phase} className="flex items-center gap-4 py-5 sm:gap-6">
                <span className="w-8 font-mono text-sm text-muted">{r.phase}</span>
                <span className="flex-1 font-medium sm:text-lg">{r.title}</span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                    r.status === "Live" || r.status === "Beta" ? "bg-accent text-white" : "border border-line text-muted"
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Join */}
      <section id="join" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-[calc(var(--radius-card)+8px)] bg-navy px-8 py-16 text-[#f7f9fc] sm:px-14">
            <div aria-hidden className="pattern-lattice pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative">
              <h2 className="max-w-2xl font-display text-3xl leading-tight font-bold sm:text-5xl">
                Help build the digital future of Santali.
              </h2>
              <p className="mt-5 max-w-xl text-lg text-[#f7f9fc]/75">
                Writers, teachers, linguists, developers and speakers — early contributors will shape
                SANTALIQ from day one. Accounts and contributions open with the public beta.
              </p>
              <Link
                href="/about"
                className="mt-8 inline-flex rounded-full bg-[#e9b83e] px-6 py-3 font-semibold text-[#071b2b] transition-opacity hover:opacity-90"
              >
                Learn about SANTALIQ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
