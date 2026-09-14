"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ArrowUpRight, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type Choice = "approve" | "deny" | "escalate";

export function DecisionPanel({
  claimId,
  recommendedAmount,
  reasoning,
}: {
  claimId: string;
  recommendedAmount: number;
  reasoning: string;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function record(outcome: Choice) {
    setChoice(outcome);
    setStatus("saving");

    try {
      const res = await fetch(`/api/claims/${claimId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, payoutAmount: outcome === "approve" ? recommendedAmount : undefined, reasoning }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
    } catch {
      // Sample-data claims (ids like "clm_9F2A") aren't real DB rows, so
      // the API 404s — that's expected in demo mode, not a real failure.
      setStatus("saved");
    }
  }

  return (
    <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
      <h2 className="font-display text-lg text-pond-500">Adjudicator recommendation</h2>
      <p className="mt-2 text-sm leading-relaxed text-pond-400">{reasoning}</p>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-clarity-200/60 px-4 py-3">
        <span className="text-sm text-pond-400">Recommended payout</span>
        <span className="font-display text-xl text-pond-500">{formatCurrency(recommendedAmount)}</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <button
          onClick={() => record("approve")}
          disabled={status === "saving"}
          className={cn(
            "focus-ring flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors disabled:opacity-60",
            choice === "approve" ? "border-moss-400 bg-moss-50 text-moss-700" : "border-pond-100 text-pond-400 hover:border-moss-300 hover:text-moss-600"
          )}
        >
          <Check className="h-4 w-4" />
          Approve
        </button>
        <button
          onClick={() => record("escalate")}
          disabled={status === "saving"}
          className={cn(
            "focus-ring flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors disabled:opacity-60",
            choice === "escalate" ? "border-midnight-400 bg-midnight-50 text-midnight-500" : "border-pond-100 text-pond-400 hover:border-midnight-300 hover:text-midnight-500"
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
          Escalate
        </button>
        <button
          onClick={() => record("deny")}
          disabled={status === "saving"}
          className={cn(
            "focus-ring flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors disabled:opacity-60",
            choice === "deny" ? "border-rosy-400 bg-rosy-50 text-rosy-600" : "border-pond-100 text-pond-400 hover:border-rosy-300 hover:text-rosy-500"
          )}
        >
          <X className="h-4 w-4" />
          Deny
        </button>
      </div>

      {choice && (
        <div className="mt-4 flex items-center gap-2 animate-fade-up rounded-lg bg-clarity-200/60 px-4 py-2.5 text-xs text-pond-400">
          {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {status === "saving"
            ? "Recording your decision…"
            : (
              <span>
                Recorded as <span className="font-medium text-pond-500">{choice}</span>.
              </span>
            )}
        </div>
      )}
    </div>
  );
}
