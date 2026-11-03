export type ReviewCounts = { pending: number; verified: number; rejected: number };

export type Overview = {
  dictionary: ReviewCounts;
  heritage: ReviewCounts;
  voice: ReviewCounts;
  voice_minutes: number;
  posts_published: number;
  posts_removed: number;
  open_reports: number;
  users_total: number;
  users_active: number;
  users_new_7d: number;
  users_by_role: Record<string, number>;
  ai_requests_7d: number;
  ai_tokens_7d: number;
  to_review: number;
};

export type Activity = {
  id: string;
  action: string;
  actor: string | null;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type SystemInfo = {
  environment: string;
  checks: Record<string, boolean>;
  features: Record<string, boolean>;
  ai_model: string;
  dataset_license: string;
  last_backup: { file?: string; size?: string; voice_files?: number } | null;
  last_backup_at: string | null;
  disk_total_gb: number | null;
  disk_free_gb: number | null;
  voice_storage_mb: number;
  database_rows: Record<string, number>;
};

/** Readable labels for audit actions. Unknown actions fall back to the raw name. */
export const ACTION_GROUPS = [
  { value: "", label: "All activity" },
  { value: "user.", label: "Accounts & users" },
  { value: "entry.", label: "Dictionary" },
  { value: "post.", label: "Writing" },
  { value: "heritage.", label: "Heritage" },
  { value: "voice.", label: "Voice" },
  { value: "profile.", label: "Profiles" },
];

export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
