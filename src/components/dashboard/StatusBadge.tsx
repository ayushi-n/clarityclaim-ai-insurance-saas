import { statusMeta, ClaimStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", meta.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
