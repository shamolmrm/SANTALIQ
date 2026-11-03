import Link from "next/link";
import { Logo } from "@/components/logo";

const nav = [
  { href: "/tools/script-converter", label: "Script Converter" },
  { href: "/#tools", label: "Tools" },
  { href: "/#principles", label: "Principles" },
  { href: "/#roadmap", label: "Roadmap" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-8 text-sm text-muted md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/#join"
          className="rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
        >
          Join early
        </Link>
      </div>
    </header>
  );
}
