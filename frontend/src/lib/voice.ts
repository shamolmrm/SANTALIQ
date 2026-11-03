import type { Status } from "@/lib/api";
import type { Script } from "@/lib/script/engine";

export type VoiceConsent = {
  consent_version: string;
  current_version: string;
  consented_at: string;
  consent_public: boolean;
  consent_research: boolean;
  dialect: string | null;
  region: string | null;
  age_range: string | null;
  gender: string | null;
};

export type VoiceClip = {
  id: string;
  text: string;
  script: Script;
  duration_ms: number | null;
  status: Status;
  created_at: string | null;
  review_note: string | null;
  speaker: { id: string; display_name: string };
  dialect: string | null;
  audio_url: string;
};

export type VoicePrompt = { lexeme_id: string; text: string; script: Script };
export type VoiceStats = { verified_clips: number; verified_minutes: number; speakers: number; pending_clips: number };

export const AGE_RANGES = ["under-18", "18-29", "30-44", "45-59", "60+"] as const;
export const MAX_SECONDS = 30;

/** Best container the browser can record: Opus in WebM/Ogg, else MP4 (Safari). */
export function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
}

export function extensionFor(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "webm";
}

export function seconds(ms: number | null): string {
  return ms ? `${(ms / 1000).toFixed(1)} s` : "";
}
