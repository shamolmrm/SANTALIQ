import type { MessageKey } from "@/lib/i18n";

export const mainNav: ReadonlyArray<{ href: string; k: MessageKey }> = [
  { href: "/tools/translator", k: "nav.translator" },
  { href: "/tools/dictionary", k: "nav.dictionary" },
  { href: "/write", k: "nav.write" },
  { href: "/learn", k: "nav.learn" },
  { href: "/heritage", k: "nav.heritage" },
  { href: "/ai", k: "nav.ai" },
  { href: "/tools", k: "nav.tools" },
];
