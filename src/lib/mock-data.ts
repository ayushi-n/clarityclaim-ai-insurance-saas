// Demo data shaped exactly like the Prisma models in prisma/schema.prisma.
// Swap any of these for `db.claim.findMany()` etc. once DATABASE_URL is
// live — the dashboard components already expect this shape.

export type ClaimStatus =
  | "SUBMITTED"
  | "ANALYZING"
  | "NEEDS_EVIDENCE"
  | "IN_REVIEW"
  | "APPROVED"
  | "DENIED"
  | "ESCALATED";

export interface MockClaim {
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

export const mockClaims: MockClaim[] = [
  {
    id: "clm_9F2A",
    claimNumber: "CC-2026-10412",
    claimantName: "Priya Nair",
    policyNumber: "POL-88231",
    incidentType: "Auto collision",
    incidentDate: "2026-08-14",
    description: "Rear-end collision at a signal on MG Road; bumper and tail-light damage.",
    claimedAmount: 182000,
    status: "IN_REVIEW",
    clarityScore: 88,
    createdAt: "2026-08-15",
    evidenceCount: 5,
    contradictionCount: 0,
  },
  {
    id: "clm_71BD",
    claimNumber: "CC-2026-10409",
    claimantName: "Arjun Mehta",
    policyNumber: "POL-77142",
    incidentType: "Water damage",
    incidentDate: "2026-08-10",
    description: "Burst pipe in kitchen ceiling caused flooring and cabinetry damage.",
    claimedAmount: 96000,
    status: "APPROVED",
    clarityScore: 94,
    createdAt: "2026-08-11",
    evidenceCount: 7,
    contradictionCount: 0,
  },
  {
    id: "clm_3CDE",
    claimNumber: "CC-2026-10401",
    claimantName: "Sana Iqbal",
    policyNumber: "POL-65390",
    incidentType: "Theft",
    incidentDate: "2026-08-02",
    description: "Laptop and camera equipment reported stolen from parked vehicle.",
    claimedAmount: 145000,
    status: "ESCALATED",
    clarityScore: 41,
    createdAt: "2026-08-03",
    evidenceCount: 3,
    contradictionCount: 2,
  },
  {
    id: "clm_18AF",
    claimNumber: "CC-2026-10420",
    claimantName: "Devraj Rao",
    policyNumber: "POL-90112",
    incidentType: "Fire damage",
    incidentDate: "2026-08-19",
    description: "Kitchen fire from an electrical short; smoke damage across two rooms.",
    claimedAmount: 310000,
    status: "ANALYZING",
    clarityScore: null,
    createdAt: "2026-08-20",
    evidenceCount: 4,
    contradictionCount: 0,
  },
  {
    id: "clm_55E1",
    claimNumber: "CC-2026-10399",
    claimantName: "Meera Pillai",
    policyNumber: "POL-40233",
    incidentType: "Auto collision",
    incidentDate: "2026-07-29",
    description: "Side-impact collision at an intersection; driver-side door and mirror damage.",
    claimedAmount: 64000,
    status: "NEEDS_EVIDENCE",
    clarityScore: 52,
    createdAt: "2026-07-30",
    evidenceCount: 1,
    contradictionCount: 1,
  },
  {
    id: "clm_02CC",
    claimNumber: "CC-2026-10388",
    claimantName: "Yusuf Ali",
    policyNumber: "POL-33871",
    incidentType: "Medical",
    incidentDate: "2026-07-21",
    description: "Emergency room visit following a fall on stairs at home.",
    claimedAmount: 28000,
    status: "DENIED",
    clarityScore: 22,
    createdAt: "2026-07-22",
    evidenceCount: 2,
    contradictionCount: 3,
  },
];

export const mockFindings = [
  { agent: "DOCUMENT_AGENT", summary: "Policy active, claim within coverage window. Amounts match invoice.", confidence: 92 },
  { agent: "VISION_AGENT", summary: "Damage pattern in photos consistent with reported rear-end impact.", confidence: 87 },
  { agent: "CONTRADICTION_ENGINE", summary: "No contradictions found between statement and repair estimate.", confidence: 90 },
  { agent: "DEBATE_ENGINE", summary: "Evidence favors claimant; insurer's only objection (delayed filing) is within the 30-day window.", confidence: 85 },
  { agent: "ADJUDICATOR", summary: "Recommend approval at the full claimed amount.", confidence: 88 },
];

export const statusMeta: Record<ClaimStatus, { label: string; color: string; dot: string }> = {
  SUBMITTED: { label: "Submitted", color: "text-midnight-500 bg-midnight-50", dot: "bg-midnight-500" },
  ANALYZING: { label: "Analyzing", color: "text-midnight-500 bg-midnight-50", dot: "bg-midnight-400" },
  NEEDS_EVIDENCE: { label: "Needs evidence", color: "text-rosy-500 bg-rosy-50", dot: "bg-rosy-400" },
  IN_REVIEW: { label: "In review", color: "text-moss-700 bg-moss-50", dot: "bg-moss-500" },
  APPROVED: { label: "Approved", color: "text-pond-500 bg-moss-50", dot: "bg-pond-400" },
  DENIED: { label: "Denied", color: "text-rosy-600 bg-rosy-50", dot: "bg-rosy-500" },
  ESCALATED: { label: "Escalated", color: "text-rosy-600 bg-rosy-100", dot: "bg-rosy-500" },
};
