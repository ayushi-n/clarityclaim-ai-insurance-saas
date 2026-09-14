"use client";

import { useState } from "react";
import { ClaimsTable } from "@/components/dashboard/ClaimsTable";
import { SampleDataBanner } from "@/components/dashboard/SampleDataBanner";
import { ClaimStatus, statusMeta, MockClaim } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tabs: (ClaimStatus | "ALL")[] = ["ALL", "SUBMITTED", "ANALYZING", "NEEDS_EVIDENCE", "IN_REVIEW", "APPROVED", "DENIED", "ESCALATED"];

export function ClaimsFilterView({ claims, usingSampleData }: { claims: MockClaim[]; usingSampleData: boolean }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("ALL");
  const filtered = tab === "ALL" ? claims : claims.filter((c) => c.status === tab);

  return (
    <div className="space-y-5">
      {usingSampleData && <SampleDataBanner />}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "focus-ring rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              tab === t ? "bg-pond-500 text-clarity-100" : "bg-clarity-200 text-pond-400 hover:bg-clarity-200/70"
            )}
          >
            {t === "ALL" ? "All" : statusMeta[t].label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <ClaimsTable claims={filtered} />
      ) : (
        <div className="rounded-2xl border border-dashed border-pond-200 bg-clarity-200/40 p-12 text-center text-sm text-pond-400">
          No claims with this status.
        </div>
      )}
    </div>
  );
}
