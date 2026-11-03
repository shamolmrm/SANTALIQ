import type { DivisionStatus } from "@/lib/ecosystem";
import { type MessageKey, T } from "@/lib/i18n";

const STYLE: Record<DivisionStatus, string> = {
  live: "bg-accent text-white",
  building: "bg-gold-soft text-accent-2",
  planned: "border border-line text-muted",
};
const LABEL: Record<DivisionStatus, MessageKey> = { live: "common.live", building: "common.building", planned: "common.planned" };

export function StatusBadge({ status }: { status: DivisionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      <T k={LABEL[status]} />
    </span>
  );
}
