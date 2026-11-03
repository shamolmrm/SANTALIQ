"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";

export function SiteFooter() {
  const t = useT().footer;
  const groups = [
    {
      title: t.tools,
      links: [
        { href: "/tools/translator", label: t.translator },
        { href: "/tools/script-converter", label: t.converter },
        { href: "/tools", label: t.allTools },
        { href: "/learn", label: t.learn },
        { href: "/heritage", label: t.heritage },
        { href: "/voice", label: t.voice },
        { href: "/dataset", label: t.dataset },
        { href: "/news", label: t.news },
        { href: "/careers", label: t.careers },
        { href: "/developers", label: t.developers },
        { href: "/groups", label: t.groups },
        { href: "/market", label: t.market },
        { href: "/media", label: t.media },
        { href: "/library", label: t.library },
      ],
    },
    {
      title: t.santaliq,
      links: [
        { href: "/about", label: t.about },
        { href: "/#ecosystem", label: t.ecosystem },
        { href: "/#roadmap", label: t.roadmap },
        { href: "/contact", label: t.contact },
        { href: "/privacy", label: t.privacy },
        { href: "/terms", label: t.terms },
      ],
    },
  ];
  return (
    <footer className="border-t border-line bg-bg-sunken">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_2fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t.tagline}</p>
          <div className="w-fit">
            <LanguageSwitch />
          </div>
        </div>
        {groups.map((g, i) => (
          <nav key={g.title} aria-label={g.title}>
            <p className="text-sm font-semibold">{g.title}</p>
            {/* the long tools list flows into two columns */}
            <ul className={`mt-3 text-sm text-muted ${i === 0 ? "grid grid-cols-2 gap-x-8 gap-y-2" : "space-y-2"}`}>
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t.bottom}</p>
          <p>
            {t.designBy}{" "}
            <a
              href="https://www.supersoftltd.com/"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 font-semibold text-fg transition-colors hover:text-accent"
            >
              Supersoft Ltd
              <span aria-hidden>↗</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
