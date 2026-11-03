import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Developers — SANTALIQ API",
  description: "Free public API for Santali: translation, dictionary search, open lexicon dataset, writing, heritage and more.",
  alternates: { canonical: "https://santaliq.supersoftltd.com/developers" },
};

const BASE = "https://santaliq.supersoftltd.com/api/v1";

const ENDPOINTS: Array<{ method: string; path: string; what: string }> = [
  { method: "GET", path: "/translate/languages", what: "Languages the translator supports (FLORES code, name, native name)" },
  { method: "POST", path: "/translate", what: "Translate text. Body: {text, source, target, engine?} (Santali = sat_Beng, output in Ol Chiki)" },
  { method: "GET", path: "/dictionary/search?q=", what: "Search verified dictionary entries in any of the five scripts" },
  { method: "GET", path: "/dataset/lexicon.json", what: "Every verified entry, CC BY 4.0 (also /dataset/lexicon.csv)" },
  { method: "GET", path: "/dictionary/contributors", what: "Contributors with verified entries" },
  { method: "GET", path: "/write/posts?kind=&author=", what: "Published writing (article, poetry, story, essay, journal, news)" },
  { method: "GET", path: "/write/posts/{slug}", what: "One published piece with its body" },
  { method: "GET", path: "/heritage/items?kind=&q=", what: "Verified heritage items (folk stories, songs, festivals, history…)" },
  { method: "GET", path: "/voice/clips", what: "Verified voice recordings whose speakers allow public listening" },
  { method: "GET", path: "/careers?kind=", what: "Open, reviewed jobs, internships, scholarships and training" },
  { method: "GET", path: "/ai/search?q=", what: "Grounded search over verified SANTALIQ data, with sources" },
  { method: "GET", path: "/people/{id}", what: "Public profile of a member" },
];

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl bg-navy p-4 text-sm leading-relaxed text-[#f7f9fc]">{children}</pre>;
}

export default function DevelopersPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-accent">SANTALIQ Developer</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Build with Santali.</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        A free, public JSON API for Santali language technology — no key needed for read access. Full interactive reference:{" "}
        <a href="/api/v1/docs" className="font-semibold text-accent">
          /api/v1/docs
        </a>{" "}
        (OpenAPI:{" "}
        <a href="/api/v1/openapi.json" className="font-semibold text-accent">
          openapi.json
        </a>
        ).
      </p>

      <h2 className="mt-14 text-2xl font-bold">Quick start</h2>
      <div className="mt-4 space-y-4">
        <Code>{`curl -X POST ${BASE}/translate \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Good morning", "source": "eng_Latn", "target": "sat_Beng"}'`}</Code>
        <Code>{`const r = await fetch("${BASE}/dataset/lexicon.json");
const { license, entries } = await r.json();  // CC BY 4.0 — credit SANTALIQ and contributors`}</Code>
      </div>

      <h2 className="mt-14 text-2xl font-bold">Public endpoints</h2>
      <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-bg-elevated">
        <table className="w-full min-w-[640px] text-left text-sm">
          <tbody className="divide-y divide-line">
            {ENDPOINTS.map((e) => (
              <tr key={e.method + e.path}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-accent">{e.method}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.path}</td>
                <td className="px-4 py-3 text-muted">{e.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-14 text-2xl font-bold">Fair use</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-muted">
        <li>Translation: 20 requests per minute per IP. Please cache results; do not mirror the whole service.</li>
        <li>
          Translator model NLLB-200 is licensed <strong>CC-BY-NC 4.0</strong> — non-commercial use of translations only.
        </li>
        <li>
          The lexicon dataset is <strong>CC BY 4.0</strong>: credit “SANTALIQ Santali Lexicon” and its contributors.
        </li>
        <li>Machine output (translation, script conversion, AI) can be wrong — label it as machine-generated in your app.</li>
        <li>
          Building something bigger, or need write access? <Link href="/contact" className="font-semibold text-accent">Contact us</Link>.
        </li>
      </ul>
    </section>
  );
}
