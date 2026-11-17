import { STATUS_LABELS, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

const styles: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-sm font-medium", styles[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
