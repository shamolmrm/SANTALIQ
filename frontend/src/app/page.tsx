import Link from "next/link";
import { ScriptShowcase } from "@/components/script-showcase";

const tools: Array<{ title: string; body: string; phase: string; href?: string }> = [
  {
    title: "Script Converter",
    body: "Move Santali text between Ol Chiki, Roman, Bengali, Odia and Devanagari — instantly, in your browser.",
    phase: "Beta · live now",
    href: "/tools/script-converter",
  },
  {
    title: "Smart Keyboard",
    body: "Type in Roman letters and get Ol Chiki as you write. Web first, Android next.",
    phase: "Phase 1",
  },
  {
    title: "Living Dictionary",
    body: "Words with meanings, native-speaker audio, dialect notes and a clear verification badge.",
    phase: "Phase 1",
  },
  {
    title: "SANTALIQ Write",
    body: "Publish articles, poetry and stories in Santali — readable in every script.",
    phase: "Phase 2",
  },
  {
    title: "Grounded AI",
    body: "Answers built on verified Santali knowledge, with sources you can check.",
    phase: "Phase 3",
  },
  {
    title: "Santali Voice",
    body: "Text-to-speech and speech recognition, built from voices shared with consent.",
    phase: "Phase 4",
  },
];

const principles = [
  {
    title: "Santali first",
    body: "Every feature is designed for Santali speakers before anyone else.",
  },
  {
    title: "Verified data",
    body: "Community contributions are reviewed before they are published or used to train AI.",
  },
  {
    title: "Community owned",
    body: "Language, voice and cultural knowledge are shared with consent and always credited.",
  },
  {
    title: "Works on slow internet",
    body: "Light, fast pages built for village networks as much as city broadband.",
  },
];

const roadmap = [
  { phase: "01", title: "Script tools & dictionary", status: "Building now" },
  { phase: "02", title: "Language data & SANTALIQ Write", status: "Next" },
  { phase: "03", title: "Grounded Santali AI", status: "Planned" },
  { phase: "04", title: "Santali voice", status: "Planned" },
  { phase: "05", title: "Learning & heritage", status: "Planned" },
  { phase: "06", title: "Community, mobile & global", status: "Planned" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(40% 50% at 30% 50%, var(--accent-soft), transparent 70%), radial-gradient(35% 45% at 70% 40%, rgba(63,174,122,0.14), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-20 pb-24 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-accent-2" />
              Building in public
            </p>
            <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl">
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
                href="/tools/script-converter"
                className="rounded-full bg-fg px-6 py-3 font-semibold text-bg transition-opacity hover:opacity-85"
              >
                Try the Script Converter
              </Link>
              <a
                href="#roadmap"
                className="rounded-full border border-line px-6 py-3 font-semibold transition-colors hover:border-fg/40"
              >
                See the roadmap
              </a>
            </div>
          </div>
          <div id="scripts" className="scroll-mt-24">
            <ScriptShowcase />
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            eyebrow="What we are building"
            title="Tools that make Santali a first-class digital language."
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <article key={tool.title} className="group bg-bg-elevated p-7 transition-colors hover:bg-bg">
                <span className="text-xs font-medium tracking-wide text-accent">{tool.phase}</span>
                <h3 className="mt-3 text-xl font-semibold">{tool.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{tool.body}</p>
                {tool.href && (
                  <Link
                    href={tool.href}
                    className="mt-5 inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                  >
                    Try it <span aria-hidden>→</span>
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section id="principles" className="scroll-mt-20 border-t border-line bg-bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading eyebrow="Our principles" title="Built with the community, not just for it." />
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <div key={p.title}>
                <div className="font-[family-name:var(--font-fraunces)] text-4xl text-accent">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading eyebrow="Roadmap" title="One step at a time, done properly." />
          <ol className="mt-14 divide-y divide-line border-y border-line">
            {roadmap.map((r) => (
              <li key={r.phase} className="flex items-center gap-6 py-5">
                <span className="w-10 font-mono text-sm text-muted">{r.phase}</span>
                <span className="flex-1 text-lg font-medium">{r.title}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    r.status === "Building now"
                      ? "bg-accent text-white"
                      : "border border-line text-muted"
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
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="rounded-[calc(var(--radius-card)+8px)] bg-fg px-8 py-16 text-bg sm:px-14">
            <h2 className="max-w-2xl font-[family-name:var(--font-fraunces)] text-4xl leading-tight font-semibold sm:text-5xl">
              Help build the digital future of Santali.
            </h2>
            <p className="mt-5 max-w-xl text-lg opacity-75">
              Writers, teachers, linguists, developers and speakers — early contributors will
              shape SANTALIQ from day one. Sign-up opens with the public beta.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium tracking-wide text-accent">{eyebrow}</p>
      <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        {title}
      </h2>
    </div>
  );
}
