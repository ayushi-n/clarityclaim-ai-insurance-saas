import Link from "next/link";
import { MockClaim } from "@/lib/mock-data";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export function ClaimsTable({ claims }: { claims: MockClaim[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-pond-100 bg-clarity-100">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-pond-100 bg-clarity-200/60 text-xs uppercase tracking-wide text-pond-400">
            <th className="px-5 py-3 font-medium">Claim</th>
            <th className="px-5 py-3 font-medium">Claimant</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Amount</th>
            <th className="px-5 py-3 font-medium">Clarity</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Filed</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="group border-b border-pond-50 last:border-0 hover:bg-clarity-200/40">
              <td className="px-5 py-4">
                <Link href={`/dashboard/claims/${c.id}`} className="font-mono text-xs font-medium text-midnight-500 hover:underline">
                  {c.claimNumber}
                </Link>
              </td>
              <td className="px-5 py-4 text-pond-500">{c.claimantName}</td>
              <td className="px-5 py-4 text-pond-400">{c.incidentType}</td>
              <td className="px-5 py-4 font-medium text-pond-500">{formatCurrency(c.claimedAmount)}</td>
              <td className="px-5 py-4">
                {c.clarityScore !== null ? (
                  <span className="font-mono text-pond-500">{c.clarityScore}</span>
                ) : (
                  <span className="text-pond-300">—</span>
                )}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-5 py-4 text-pond-400">{formatDate(c.createdAt)}</td>
              <td className="px-5 py-4 text-right">
                <Link href={`/dashboard/claims/${c.id}`}>
                  <ChevronRight className="h-4 w-4 text-pond-300 transition-transform group-hover:translate-x-0.5 group-hover:text-pond-500" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
