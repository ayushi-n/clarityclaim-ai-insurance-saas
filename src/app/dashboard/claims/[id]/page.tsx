import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClaimDetail } from "@/lib/queries";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ClarityGauge } from "@/components/dashboard/ClarityGauge";
import { AgentTimeline } from "@/components/dashboard/AgentTimeline";
import { DecisionPanel } from "@/components/dashboard/DecisionPanel";
import { SampleDataBanner } from "@/components/dashboard/SampleDataBanner";
import { RerunAnalysisButton } from "@/components/dashboard/RerunAnalysisButton";
import { mockClaims, mockFindings, ClaimStatus } from "@/lib/mock-data";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { FileText, ImageIcon, Mic, Film, AlertTriangle, User, Calendar, Hash } from "lucide-react";

const evidenceIcons: Record<string, any> = { DOCUMENT: FileText, IMAGE: ImageIcon, AUDIO: Mic, VIDEO: Film };

const sampleEvidence = [
  { id: "1", type: "DOCUMENT", fileName: "repair_estimate.pdf" },
  { id: "2", type: "IMAGE", fileName: "bumper_damage_1.jpg" },
  { id: "3", type: "IMAGE", fileName: "bumper_damage_2.jpg" },
  { id: "4", type: "DOCUMENT", fileName: "police_report.pdf" },
  { id: "5", type: "AUDIO", fileName: "claimant_statement.mp3" },
];

const sampleContradictions = [
  { id: "1", sourceA: "Claimant statement", sourceB: "Police report", description: "Incident time differs by 40 minutes.", severity: 2 },
];

export default async function ClaimDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const realClaim = await getClaimDetail(params.id, session!.user.organizationId);

  if (realClaim) {
    return (
      <div className="flex-1">
        <Topbar title={realClaim.claimNumber} subtitle={`Filed ${formatDate(realClaim.createdAt)} · ${realClaim.incidentType}`} />

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ClaimHeader
              claimantName={realClaim.claimantName}
              policyNumber={realClaim.policyNumber}
              description={realClaim.description}
              claimedAmount={realClaim.claimedAmount}
              incidentDate={realClaim.incidentDate}
              incidentType={realClaim.incidentType}
              contradictionCount={realClaim.contradictions.length}
              status={realClaim.status as ClaimStatus}
            />

            <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
              <h2 className="font-display text-lg text-pond-500">Evidence on file</h2>
              {realClaim.evidence.length === 0 ? (
                <p className="mt-3 text-sm text-pond-400">No evidence uploaded yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {realClaim.evidence.map((e: (typeof realClaim.evidence)[number]) => {
                    const Icon = evidenceIcons[e.type] ?? FileText;
                    return (
                      <a
                        key={e.id}
                        href={e.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-pond-50 bg-clarity-200/50 px-4 py-3 hover:bg-clarity-200"
                      >
                        {e.type === "IMAGE" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.fileUrl} alt={e.fileName} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-moss-50 text-moss-600">
                            <Icon className="h-4 w-4" />
                          </div>
                        )}
                        <span className="truncate text-sm text-pond-500">{e.fileName}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg text-pond-500">Agent pipeline trace</h2>
                <RerunAnalysisButton
                  claimId={realClaim.id}
                  label={realClaim.findings.length === 0 ? "Run analysis" : "Re-run analysis"}
                />
              </div>
              {realClaim.findings.length === 0 ? (
                <p className="text-sm text-pond-400">
                  Analysis hasn't run yet. Upload the evidence, then click "Run analysis" — the agents read every
                  document, photo, audio and video file.
                </p>
              ) : (
                <AgentTimeline findings={realClaim.findings} />
              )}
            </div>

            {realClaim.contradictions.length > 0 && (
              <div className="rounded-2xl border border-rosy-200 bg-rosy-50/50 p-6">
                <h2 className="flex items-center gap-2 font-display text-lg text-rosy-600">
                  <AlertTriangle className="h-4 w-4" /> Contradictions found
                </h2>
                <div className="mt-4 space-y-3">
                  {realClaim.contradictions.map((c: (typeof realClaim.contradictions)[number]) => (
                    <div key={c.id} className="rounded-xl bg-clarity-100 p-4">
                      <div className="flex items-center justify-between text-xs font-mono text-pond-400">
                        <span>{c.sourceA} vs {c.sourceB}</span>
                        <span className="rounded-full bg-rosy-100 px-2 py-0.5 text-rosy-600">Severity {c.severity}/5</span>
                      </div>
                      <p className="mt-2 text-sm text-pond-500">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center rounded-2xl border border-pond-100 bg-clarity-100 p-6 text-center">
              <ClarityGauge score={realClaim.clarityScore ?? 0} />
              <p className="mt-3 text-sm text-pond-400">
                {realClaim.clarityScore === null
                  ? "Awaiting the agent pipeline's first pass."
                  : realClaim.clarityScore >= 70
                    ? "Evidence is strong and consistent across sources."
                    : "Some findings need a closer look before payout."}
              </p>
              <ScoreBreakdownList breakdown={realClaim.decision?.scoreBreakdown as any} />
            </div>

            <DecisionPanel
              claimId={realClaim.id}
              recommendedAmount={realClaim.decision?.payoutAmount ?? realClaim.claimedAmount}
              reasoning={
                realClaim.decision?.reasoning ??
                "No recommendation yet — this claim is still waiting on its first agent pass."
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // Fall back to the bundled sample claims so the detail page still works
  // for anyone exploring the demo before creating a real claim.
  const claim = mockClaims.find((c) => c.id === params.id);
  if (!claim) notFound();

  return (
    <div className="flex-1">
      <Topbar title={claim.claimNumber} subtitle={`Filed ${formatDate(claim.createdAt)} · ${claim.incidentType}`} />

      <div className="p-6 pb-0">
        <SampleDataBanner />
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ClaimHeader
            claimantName={claim.claimantName}
            policyNumber={claim.policyNumber}
            description={claim.description}
            claimedAmount={claim.claimedAmount}
            incidentDate={claim.incidentDate}
            incidentType={claim.incidentType}
            contradictionCount={claim.contradictionCount}
            status={claim.status}
          />

          <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
            <h2 className="font-display text-lg text-pond-500">Evidence on file</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sampleEvidence.map((e) => {
                const Icon = evidenceIcons[e.type];
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl border border-pond-50 bg-clarity-200/50 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-moss-50 text-moss-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="truncate text-sm text-pond-500">{e.fileName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
            <h2 className="mb-6 font-display text-lg text-pond-500">Agent pipeline trace</h2>
            <AgentTimeline findings={mockFindings} />
          </div>

          {sampleContradictions.length > 0 && (
            <div className="rounded-2xl border border-rosy-200 bg-rosy-50/50 p-6">
              <h2 className="flex items-center gap-2 font-display text-lg text-rosy-600">
                <AlertTriangle className="h-4 w-4" /> Contradictions found
              </h2>
              <div className="mt-4 space-y-3">
                {sampleContradictions.map((c) => (
                  <div key={c.id} className="rounded-xl bg-clarity-100 p-4">
                    <div className="flex items-center justify-between text-xs font-mono text-pond-400">
                      <span>{c.sourceA} vs {c.sourceB}</span>
                      <span className="rounded-full bg-rosy-100 px-2 py-0.5 text-rosy-600">Severity {c.severity}/5</span>
                    </div>
                    <p className="mt-2 text-sm text-pond-500">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex flex-col items-center rounded-2xl border border-pond-100 bg-clarity-100 p-6 text-center">
            <ClarityGauge score={claim.clarityScore ?? 0} />
            <p className="mt-3 text-sm text-pond-400">
              {claim.clarityScore && claim.clarityScore >= 70
                ? "Evidence is consistent across every agent."
                : "Some findings need a closer look before payout."}
            </p>
          </div>

          <DecisionPanel
            claimId={claim.id}
            recommendedAmount={claim.claimedAmount}
            reasoning="Document and Vision agents agree on damage extent and repair cost. No unresolved contradictions. Debate engine found no material objection from the insurer's side."
          />
        </div>
      </div>
    </div>
  );
}

function ClaimHeader({
  claimantName,
  policyNumber,
  description,
  claimedAmount,
  incidentDate,
  incidentType,
  contradictionCount,
  status,
}: {
  claimantName: string;
  policyNumber: string;
  description: string;
  claimedAmount: number;
  incidentDate: string | Date;
  incidentType: string;
  contradictionCount: number;
  status: ClaimStatus;
}) {
  return (
    <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pond-500 font-display text-sm text-clarity-100">
            {initials(claimantName)}
          </div>
          <div>
            <p className="font-display text-xl text-pond-500">{claimantName}</p>
            <p className="text-sm text-pond-400">{policyNumber}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="mt-5 text-sm leading-relaxed text-pond-500/85">{description}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-pond-50 pt-5 sm:grid-cols-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-pond-400"><Hash className="h-3 w-3" />Claimed</p>
          <p className="mt-1 font-display text-lg text-pond-500">{formatCurrency(claimedAmount)}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-pond-400"><Calendar className="h-3 w-3" />Incident date</p>
          <p className="mt-1 font-display text-lg text-pond-500">{formatDate(incidentDate)}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-pond-400"><User className="h-3 w-3" />Type</p>
          <p className="mt-1 font-display text-lg text-pond-500">{incidentType}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-pond-400"><AlertTriangle className="h-3 w-3" />Contradictions</p>
          <p className="mt-1 font-display text-lg text-pond-500">{contradictionCount}</p>
        </div>
      </div>
    </div>
  );
}

function ScoreBreakdownList({
  breakdown,
}: {
  breakdown?: { coverage: number; consistency: number; contradictions: number; agreement: number; notes?: string[] } | null;
}) {
  if (!breakdown) return null;
  const rows = [
    { label: "Evidence coverage", value: breakdown.coverage, max: 25 },
    { label: "Consistency with claim", value: breakdown.consistency, max: 35 },
    { label: "Free of contradictions", value: breakdown.contradictions, max: 25 },
    { label: "Agent agreement", value: breakdown.agreement, max: 15 },
  ];
  return (
    <div className="mt-5 w-full space-y-2.5 border-t border-pond-50 pt-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-pond-400">How the score was computed</p>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs text-pond-500">
            <span>{r.label}</span>
            <span className="font-mono">
              {r.value}/{r.max}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-clarity-200">
            <div className="h-full rounded-full bg-moss-500" style={{ width: `${Math.round((r.value / r.max) * 100)}%` }} />
          </div>
        </div>
      ))}
      {breakdown.notes && breakdown.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-pond-400">
          {breakdown.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
