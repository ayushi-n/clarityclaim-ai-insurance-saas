import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  positive = true,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6 transition-shadow hover:shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-pond-400">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-midnight-50 text-midnight-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl text-pond-500">{value}</p>
      {delta && (
        <p className={cn("mt-1 text-xs font-medium", positive ? "text-moss-600" : "text-rosy-500")}>{delta}</p>
      )}
    </div>
  );
}
