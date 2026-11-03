import type { Status } from "@/lib/api";

export type JobKind = "job" | "internship" | "scholarship" | "training";

export type Job = {
  id: string;
  kind: JobKind;
  title: string;
  organization: string;
  location: string | null;
  description: string;
  apply_url: string | null;
  apply_email: string | null;
  deadline: string | null;
  status: Status;
  created_at: string | null;
  review_note: string | null;
  posted_by: string | null;
};

export const JOB_KINDS: Array<{ value: JobKind; label: string }> = [
  { value: "job", label: "Jobs" },
  { value: "internship", label: "Internships" },
  { value: "scholarship", label: "Scholarships" },
  { value: "training", label: "Training" },
];

export const JOB_LABEL: Record<JobKind, string> = {
  job: "Job",
  internship: "Internship",
  scholarship: "Scholarship",
  training: "Training",
};
