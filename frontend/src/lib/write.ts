import type { Script } from "@/lib/script/engine";

export type PostKind = "article" | "poetry" | "story" | "essay" | "journal" | "news";
export type PostStatus = "draft" | "published" | "removed";

export type PostCard = {
  id: string;
  slug: string;
  title: string;
  kind: PostKind;
  script: Script;
  excerpt: string;
  status: PostStatus;
  published_at: string | null;
  updated_at: string | null;
  author: { id: string; display_name: string };
};

export type Post = PostCard & { body: string; moderation_note: string | null };

export const KINDS: Array<{ value: PostKind; label: string }> = [
  { value: "article", label: "Articles" },
  { value: "poetry", label: "Poetry" },
  { value: "story", label: "Stories" },
  { value: "essay", label: "Essays" },
  { value: "journal", label: "Journals" },
];

export const KIND_LABEL: Record<PostKind, string> = {
  article: "Article",
  poetry: "Poetry",
  story: "Story",
  essay: "Essay",
  journal: "Journal",
  news: "News",
};

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
