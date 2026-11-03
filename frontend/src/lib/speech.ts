"use client";

/**
 * Browser speech (Web Speech API): text-to-speech and speech recognition.
 * Availability depends on the browser and the voices installed on the device.
 * No browser ships a Santali voice or recogniser yet — SANTALIQ Voice (Phase 4) will add it.
 */
import { useEffect, useState } from "react";

const REGION: Record<string, string> = { en: "en-US", bn: "bn-IN", hi: "hi-IN", or: "or-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN", gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", ur: "ur-IN", ne: "ne-NP" };
export const bcp47 = (iso: string) => REGION[iso] ?? iso;

/** Installed voices, refreshed when the browser finishes loading them. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

export function voiceFor(voices: SpeechSynthesisVoice[], iso: string): SpeechSynthesisVoice | undefined {
  const base = iso.split("-")[0].toLowerCase();
  const full = bcp47(iso).toLowerCase();
  return voices.find((v) => v.lang.toLowerCase() === full) ?? voices.find((v) => v.lang.toLowerCase().split("-")[0] === base);
}

export function speak(text: string, voice: SpeechSynthesisVoice, onEnd?: () => void): void {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ── Speech recognition (Chrome/Edge/Safari; not Firefox) ──

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

export function recognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createRecognizer(iso: string): Recognition | null {
  const w = window as unknown as Record<string, new () => Recognition>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = bcp47(iso);
  r.interimResults = true;
  r.continuous = true;
  return r;
}
