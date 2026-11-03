import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted">Santali Language. AI Innovation.</p>
        </div>
        <p className="text-sm text-muted">
          Santali first · Multi-script · Community owned
          <br className="md:hidden" />
          <span className="hidden md:inline"> · </span>© SANTALIQ
        </p>
      </div>
    </footer>
  );
}
