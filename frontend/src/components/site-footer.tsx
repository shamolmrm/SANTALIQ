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
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t.tagline}</p>
          <LanguageSwitch />
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
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">{t.bottom}</p>
      </div>
    </footer>
  );
}
