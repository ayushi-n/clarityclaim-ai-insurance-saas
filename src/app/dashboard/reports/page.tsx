import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReportAggregates } from "@/lib/queries";
import { Topbar } from "@/components/dashboard/Topbar";
import { ReportCharts } from "@/components/dashboard/ReportCharts";
import { SampleDataBanner } from "@/components/dashboard/SampleDataBanner";

const demoByStatus = [
  { status: "APPROVED", count: 61 },
  { status: "IN_REVIEW", count: 18 },
  { status: "ESCALATED", count: 12 },
  { status: "DENIED", count: 9 },
];

const demoByType = [
  { type: "Auto", count: 34 },
  { type: "Property", count: 21 },
  { type: "Water damage", count: 14 },
  { type: "Theft", count: 9 },
  { type: "Medical", count: 6 },
];

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  const aggregates = await getReportAggregates(session!.user.organizationId);
  const usingSampleData = aggregates.byStatus.length === 0;

  return (
    <div className="flex-1">
      <Topbar title="Reports" subtitle="Portfolio-level view across your workspace" />

      <div className="p-6">
        {usingSampleData && <div className="mb-2"><SampleDataBanner /></div>}
        <ReportCharts
          byStatus={usingSampleData ? demoByStatus : aggregates.byStatus}
          byType={usingSampleData ? demoByType : aggregates.byType}
        />
      </div>
    </div>
  );
}
