"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

/** Runs (or re-runs) the agent pipeline for a claim, then refreshes the page. */
export function RerunAnalysisButton({ claimId, label = "Re-run analysis" }: { claimId: string; label?: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${claimId}/analyze`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "The analysis failed to run.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="focus-ring inline-flex items-center gap-2 rounded-xl border border-pond-100 px-4 py-2 text-sm font-medium text-pond-500 transition-colors hover:bg-clarity-200 disabled:cursor-wait disabled:opacity-60"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {running ? "Agents are analyzing… (1–3 min)" : label}
      </button>
      {error && <p className="mt-2 text-sm text-rosy-600">{error}</p>}
    </div>
  );
}
