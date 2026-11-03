import type { DivisionStatus } from "@/lib/ecosystem";

const STYLE: Record<DivisionStatus, string> = {
  live: "bg-accent text-white",
  building: "bg-gold-soft text-accent-2",
  planned: "border border-line text-muted",
};
const LABEL: Record<DivisionStatus, string> = { live: "Live", building: "Building", planned: "Planned" };

export function StatusBadge({ status }: { status: DivisionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
