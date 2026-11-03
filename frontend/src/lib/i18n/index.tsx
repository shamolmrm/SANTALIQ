"use client";

import { Fragment, type ReactNode, useSyncExternalStore } from "react";
import { fill, MESSAGES, type Messages } from "./messages";
import { BN } from "./phrases";

export { fill } from "./messages";

export type Locale = keyof typeof MESSAGES;
export const LOCALES: Locale[] = ["en", "bn"];
const KEY = "santaliq.locale";

/**
 * Interface language, chosen by the visitor and remembered in this browser.
 * The server always renders English (good for search engines); the browser switches
 * immediately after load. `localeInitScript` sets <html lang> before paint.
 */
let current: Locale | null = null;
const listeners = new Set<() => void>();

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "bn") return saved;
  } catch {
    /* storage blocked */
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("bn") ? "bn" : "en";
}

function snapshot(): Locale {
  if (current === null) current = detect();
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setLocale(l: Locale) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* storage blocked: still switch for this visit */
  }
  document.documentElement.lang = l;
  listeners.forEach((cb) => cb());
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, snapshot, () => "en");
}

export function useT(): Messages {
  return MESSAGES[useLocale()];
}

// ── tr("English text"): phrase-keyed translation for the long tail of page text ──
// The language used by tr(). It stays "en" during hydration (matching the server HTML),
// then <I18nRoot> switches it and remounts the page so every tr() call re-renders.
let active: Locale = "en";

function activate(l: Locale) {
  active = l;
}

/** Translate an English phrase into the active interface language (falls back to English). */
export function tr(english: string, values?: Record<string, string>): string {
  const s = active === "bn" ? (BN[english] ?? english) : english;
  return values ? fill(s, values) : s;
}

/** Phrase translation inside server components: <Tr s="English text" />. */
export function Tr({ s }: { s: string }) {
  const l = useLocale();
  return <>{l === "bn" ? (BN[s] ?? s) : s}</>;
}

/** Wraps the page: applies the chosen language and remounts content when it changes. */
export function I18nRoot({ children }: { children: ReactNode }) {
  const locale = useLocale();
  activate(locale);
  return <Fragment key={locale}>{children}</Fragment>;
}

type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends Record<string, string> ? `${K}.${keyof T[K] & string}` : never;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

/** Translated text for use inside server components: <T k="home.title1" />. */
export function T({ k }: { k: MessageKey }) {
  const m = useT();
  const [group, key] = k.split(".") as [keyof Messages, string];
  const value = (m[group] as Record<string, string>)[key];
  return <>{value}</>;
}

