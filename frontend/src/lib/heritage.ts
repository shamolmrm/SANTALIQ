import type { Status } from "@/lib/api";
import type { Script } from "@/lib/script/engine";

export type HeritageKind = "folk_story" | "song" | "festival" | "history" | "craft" | "other";

export type HeritageCard = {
  id: string;
  slug: string;
  kind: HeritageKind;
  title: string;
  script: Script;
  excerpt: string;
  region: string | null;
  status: Status;
  created_at: string | null;
  reviewed_at: string | null;
  contributor: { id: string; display_name: string } | null;
};

export type HeritageItem = HeritageCard & { body: string; source: string; review_note: string | null };

export const HERITAGE_KINDS: Array<{ value: HeritageKind; label: string; hint: string }> = [
  { value: "folk_story", label: "Folk stories", hint: "Stories passed down by word of mouth" },
  { value: "song", label: "Songs", hint: "Song lyrics and their occasions" },
  { value: "festival", label: "Festivals", hint: "How festivals and gatherings are celebrated" },
  { value: "history", label: "History", hint: "Events, places and people remembered by the community" },
  { value: "craft", label: "Crafts & knowledge", hint: "Crafts, food, farming and traditional knowledge" },
  { value: "other", label: "Other", hint: "Anything else worth preserving" },
];

export const HERITAGE_LABEL: Record<HeritageKind, string> = Object.fromEntries(
  HERITAGE_KINDS.map((k) => [k.value, k.label]),
) as Record<HeritageKind, string>;
