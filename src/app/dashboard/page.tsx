import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClaimsForOrg, getDashboardStats } from "@/lib/queries";
import { mockClaims } from "@/lib/mock-data";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClaimsTable } from "@/components/dashboard/ClaimsTable";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { SampleDataBanner } from "@/components/dashboard/SampleDataBanner";
import { FileStack, Clock, ShieldCheck, AlertTriangle } from "lucide-react";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;

  const [claims, stats] = await Promise.all([
    getClaimsForOrg(organizationId),
    getDashboardStats(organizationId),
  ]);

  const usingSampleData = claims.length === 0;
  const rows = usingSampleData ? mockClaims : claims;
  const approvalRate = usingSampleData
    ? 71
    : stats.total > 0
      ? Math.round((stats.approved / stats.total) * 100)
      : 0;

  return (
    <div className="flex-1">
      <Topbar title="Overview" subtitle={session!.user.organizationName} />

      <div className="space-y-8 p-6">
        {usingSampleData && <SampleDataBanner />}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open claims" value={String(usingSampleData ? 48 : stats.open)} icon={FileStack} />
          <StatCard label="Avg. time to decision" value="4.2 min" delta="−18% vs last month" icon={Clock} />
          <StatCard label="Auto-approved" value={`${approvalRate}%`} icon={ShieldCheck} />
          <StatCard
            label="Awaiting human review"
            value={String(usingSampleData ? 9 : stats.awaitingReview)}
            positive={false}
            icon={AlertTriangle}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg text-pond-500">Decisions over time</h2>
                <p className="text-xs text-pond-400">Last 14 days, by outcome</p>
              </div>
            </div>
            <OverviewChart />
          </div>

          <div className="rounded-2xl border border-pond-100 bg-pond-500 p-6 text-clarity-100">
            <h2 className="font-display text-lg">Pipeline health</h2>
            <p className="mt-1 text-xs text-clarity-100/60">Agent-level confidence, this week</p>
            <div className="mt-6 space-y-4">
              {[
                { name: "Document agent", value: 94 },
                { name: "Vision agent", value: 88 },
                { name: "Audio agent", value: 81 },
                { name: "Contradiction engine", value: 90 },
                { name: "Adjudicator", value: 86 },
              ].map((a) => (
                <div key={a.name}>
                  <div className="mb-1.5 flex justify-between text-xs text-clarity-100/70">
                    <span>{a.name}</span>
                    <span className="font-mono">{a.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-clarity-100/10">
                    <div
                      className="h-full rounded-full bg-moss-300 transition-all duration-700"
                      style={{ width: `${a.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg text-pond-500">Recent claims</h2>
            <a href="/dashboard/claims" className="text-sm font-medium text-midnight-500 hover:underline">
              View all
            </a>
          </div>
          <ClaimsTable claims={rows.slice(0, 6)} />
        </div>
      </div>
    </div>
  );
}
