"use client";

import { LOCALES, setLocale, useLocale, useT } from "@/lib/i18n";

/** EN | বাংলা switch for the interface language (remembered in this browser). */
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t.lang.label} className="flex rounded-full border border-line p-0.5 text-xs font-medium">
      {LOCALES.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={locale === l}
          onClick={() => setLocale(l)}
          lang={l}
          className={`rounded-full px-2.5 py-1 transition-colors ${locale === l ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
        >
          {l === "en" ? "EN" : t.lang.bn}
        </button>
      ))}
    </div>
  );
}
