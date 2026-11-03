"use client";

import { useSyncExternalStore } from "react";
import { MESSAGES, type Messages } from "./messages";

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

