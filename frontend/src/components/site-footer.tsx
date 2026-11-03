import Link from "next/link";
import { Logo } from "@/components/logo";

const groups = [
  {
    title: "Tools",
    links: [
      { href: "/tools/translator", label: "Translator" },
      { href: "/tools/script-converter", label: "Script Converter" },
      { href: "/tools", label: "All tools" },
      { href: "/learn", label: "Learn Ol Chiki" },
      { href: "/heritage", label: "Heritage archive" },
      { href: "/voice", label: "Lend your voice" },
      { href: "/dataset", label: "Open dataset" },
    ],
  },
  {
    title: "SANTALIQ",
    links: [
      { href: "/about", label: "About" },
      { href: "/#ecosystem", label: "Ecosystem" },
      { href: "/#roadmap", label: "Roadmap" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg-sunken">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Santali Language. AI Innovation. A digital home for the Santali language, people and culture.
          </p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <p className="text-sm font-semibold">{g.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © SANTALIQ · Santali first · Multi-script · Community owned
        </p>
      </div>
    </footer>
  );
}
