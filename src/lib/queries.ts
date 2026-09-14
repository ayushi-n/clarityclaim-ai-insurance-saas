import { db } from "@/lib/db";
import type { ClaimStatus } from "@/lib/mock-data";

export interface ClaimSummary {
  id: string;
  claimNumber: string;
  claimantName: string;
  policyNumber: string;
  incidentType: string;
  incidentDate: string;
  description: string;
  claimedAmount: number;
  status: ClaimStatus;
  clarityScore: number | null;
  createdAt: string;
  evidenceCount: number;
  contradictionCount: number;
}

/** All claims for an organization, newest first. Optionally filtered by status. */
export async function getClaimsForOrg(organizationId: string, status?: ClaimStatus): Promise<ClaimSummary[]> {
  const claims = await db.claim.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { evidence: true, contradictions: true } } },
  });

  return claims.map((c: (typeof claims)[number]) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    claimantName: c.claimantName,
    policyNumber: c.policyNumber,
    incidentType: c.incidentType,
    incidentDate: c.incidentDate.toISOString(),
    description: c.description,
    claimedAmount: c.claimedAmount,
    status: c.status as ClaimStatus,
    clarityScore: c.clarityScore,
    createdAt: c.createdAt.toISOString(),
    evidenceCount: c._count.evidence,
    contradictionCount: c._count.contradictions,
  }));
}

/** A single claim with every relation the claim detail page needs. */
export async function getClaimDetail(id: string, organizationId: string) {
  return db.claim.findFirst({
    where: { id, organizationId },
    include: {
      evidence: true,
      findings: { orderBy: { createdAt: "asc" } },
      contradictions: true,
      decision: true,
      humanReviews: { include: { reviewer: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

/** Portfolio-level counts for the overview page's stat cards. */
export async function getDashboardStats(organizationId: string) {
  const [open, approved, awaitingReview, total] = await Promise.all([
    db.claim.count({ where: { organizationId, status: { in: ["SUBMITTED", "ANALYZING", "IN_REVIEW", "NEEDS_EVIDENCE"] } } }),
    db.claim.count({ where: { organizationId, status: "APPROVED" } }),
    db.claim.count({ where: { organizationId, status: { in: ["IN_REVIEW", "ESCALATED"] } } }),
    db.claim.count({ where: { organizationId } }),
  ]);

  return { open, approved, awaitingReview, total };
}

/** Claim counts grouped by outcome and by incident type, for the reports page. */
export async function getReportAggregates(organizationId: string) {
  const [byStatus, byType] = await Promise.all([
    db.claim.groupBy({ by: ["status"] as const, where: { organizationId }, _count: true }),
    db.claim.groupBy({ by: ["incidentType"] as const, where: { organizationId }, _count: true }),
  ]);

  return {
    byStatus: byStatus.map((s: (typeof byStatus)[number]) => ({ status: s.status, count: s._count })),
    byType: byType
      .map((t: (typeof byType)[number]) => ({ type: t.incidentType, count: t._count }))
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count),
  };
}
