import Link from "next/link";
import { Suspense } from "react";
import { AuthMenu } from "@/components/auth-menu";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { T } from "@/lib/i18n";
import { mainNav } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-5 text-sm text-muted lg:flex xl:gap-7">
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-fg">
              <T k={item.k} />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitch />
          </div>
          <ThemeToggle />
          <AuthMenu />
          <Suspense fallback={null}>
            <MobileNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
