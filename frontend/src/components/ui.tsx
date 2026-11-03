import type { ComponentProps, ReactNode } from "react";
import { Tr } from "@/lib/i18n";

/** Small shared form/UI primitives for the design system. */

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-line bg-bg px-4 py-2.5 outline-none transition-colors focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-xl border border-line bg-bg px-4 py-2.5 outline-none transition-colors focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Button({
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-fg text-bg hover:opacity-90",
    secondary: "border border-line bg-bg-elevated hover:border-fg/30",
    danger: "border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${props.className ?? ""}`}
    />
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    success: "border-accent/30 bg-accent-soft text-accent",
    info: "border-line bg-bg-sunken text-muted",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, lead }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode }) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-accent">{eyebrow}</p>}
      <h1 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">{title}</h1>
      {lead && <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  verified: "bg-accent text-white",
  pending: "bg-gold-soft text-accent-2",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  draft: "border border-line text-muted",
};

export function EntryStatus({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status] ?? ""}`}>
      <Tr s={status} />
    </span>
  );
}
