import { Sparkles } from "lucide-react";

export function SampleDataBanner() {
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-midnight-200 bg-midnight-50 px-4 py-2.5 text-sm text-midnight-500">
      <Sparkles className="h-4 w-4 shrink-0" />
      Showing sample claims so you can see the pipeline in action — create your first real claim to replace these.
    </div>
  );
}
