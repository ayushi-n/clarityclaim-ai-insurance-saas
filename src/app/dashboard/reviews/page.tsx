import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClaimsForOrg } from "@/lib/queries";
import { mockClaims } from "@/lib/mock-data";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { SampleDataBanner } from "@/components/dashboard/SampleDataBanner";
import { formatCurrency, initials } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

const reviewStatuses = new Set(["ESCALATED", "IN_REVIEW", "NEEDS_EVIDENCE"]);

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  const claims = await getClaimsForOrg(session!.user.organizationId);
  const usingSampleData = claims.length === 0;
  const source = usingSampleData ? mockClaims : claims;
  const queue = source.filter((c) => reviewStatuses.has(c.status));

  return (
    <div className="flex-1">
      <Topbar title="Human review" subtitle={`${queue.length} claims waiting on a reviewer`} />

      <div className="space-y-4 p-6">
        {usingSampleData && <SampleDataBanner />}

        {queue.map((c) => (
          <div key={c.id} className="flex flex-col gap-4 rounded-2xl border border-pond-100 bg-clarity-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pond-500 font-display text-sm text-clarity-100">
                {initials(c.claimantName)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <a href={`/dashboard/claims/${c.id}`} className="font-mono text-xs text-midnight-500 hover:underline">{c.claimNumber}</a>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-0.5 text-sm text-pond-500">{c.claimantName} · {c.incidentType} · {formatCurrency(c.claimedAmount)}</p>
                {c.contradictionCount > 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-rosy-500">
                    <AlertTriangle className="h-3 w-3" /> {c.contradictionCount} contradiction{c.contradictionCount > 1 ? "s" : ""} flagged
                  </p>
                )}
              </div>
            </div>
            <Button href={`/dashboard/claims/${c.id}`} variant="outline" size="sm" className="w-fit border-pond-200 text-pond-500 hover:bg-pond-50">
              Review claim
            </Button>
          </div>
        ))}

        {queue.length === 0 && (
          <div className="rounded-2xl border border-dashed border-pond-200 bg-clarity-200/40 p-12 text-center text-sm text-pond-400">
            Nothing waiting on you right now.
          </div>
        )}
      </div>
    </div>
  );
}
