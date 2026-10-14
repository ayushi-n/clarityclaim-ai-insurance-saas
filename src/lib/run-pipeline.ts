import { db } from "@/lib/db";
import { runFullPipeline, type EvidenceKind } from "@/lib/ai-pipeline";

/**
 * Runs the full agent pipeline for a claim and writes every result back to
 * the database: per-agent findings, contradictions, the decision (with the
 * score breakdown) and a notification. Safe to re-run — previous results
 * for the claim are replaced. Shared by the QStash worker route and the
 * "Send to the pipeline" / "Re-run analysis" buttons.
 */
export async function runPipelineForClaim(claimId: string) {
  const claim = await db.claim.findUnique({ where: { id: claimId }, include: { evidence: true } });
  if (!claim) throw new Error("Claim not found");

  const previousStatus = claim.status;
  await db.claim.update({ where: { id: claimId }, data: { status: "ANALYZING" } });

  try {
    const result = await runFullPipeline(
      {
        claimNumber: claim.claimNumber,
        claimantName: claim.claimantName,
        policyNumber: claim.policyNumber,
        incidentType: claim.incidentType,
        incidentDate: claim.incidentDate.toISOString(),
        description: claim.description,
        claimedAmount: claim.claimedAmount,
      },
      claim.evidence.map((e: (typeof claim.evidence)[number]) => ({
        type: e.type as EvidenceKind,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
      }))
    );

    const evidenceIdByName = new Map<string, string>(
      claim.evidence.map((e: (typeof claim.evidence)[number]) => [e.fileName, e.id])
    );
    const ordered = [...result.findings, result.missingEvidence, result.contradictions, result.debate, result.adjudication];

    const { total, ...parts } = result.score;
    const clarityScore = total;
    // The AI may auto-approve only strong, consistent claims. A denial is never
    // final without a person: it goes to review. Severe contradictions or very
    // weak evidence are escalated.
    const severe = result.contradictionList.some((c) => c.severity >= 4);
    const status =
      result.outcome === "approve" && !result.requiresHuman
        ? "APPROVED"
        : severe || total < 40
          ? "ESCALATED"
          : "IN_REVIEW";

    await db.$transaction([
      db.agentFinding.deleteMany({ where: { claimId } }),
      db.contradiction.deleteMany({ where: { claimId } }),
      db.agentFinding.createMany({
        data: ordered.map((f) => ({
          claimId,
          evidenceId: f.fileName ? evidenceIdByName.get(f.fileName) ?? null : null,
          agent: f.agent as any,
          summary: f.summary,
          confidence: f.confidence,
          rawOutput: f.rawOutput,
        })),
      }),
      ...(result.contradictionList.length
        ? [
            db.contradiction.createMany({
              data: result.contradictionList.map((c) => ({ claimId, ...c })),
            }),
          ]
        : []),
      db.claim.update({ where: { id: claimId }, data: { clarityScore, status } }),
      db.decision.upsert({
        where: { claimId },
        update: {
          outcome: result.outcome,
          payoutAmount: result.recommendedPayout,
          reasoning: String(result.adjudication.data.reasoning ?? result.adjudication.summary),
          confidence: clarityScore,
          requiresHuman: result.requiresHuman,
          scoreBreakdown: { ...parts, total },
        },
        create: {
          claimId,
          outcome: result.outcome,
          payoutAmount: result.recommendedPayout,
          reasoning: String(result.adjudication.data.reasoning ?? result.adjudication.summary),
          confidence: clarityScore,
          requiresHuman: result.requiresHuman,
          scoreBreakdown: { ...parts, total },
        },
      }),
      db.notification.create({
        data: {
          organizationId: claim.organizationId,
          claimId,
          message: `Claim ${claim.claimNumber} finished analysis — clarity score ${clarityScore}, recommendation: ${result.outcome}.`,
        },
      }),
    ]);

    return { ok: true, clarityScore, outcome: result.outcome, status };
  } catch (err) {
    // Don't leave the claim stuck in "ANALYZING" if something fails.
    await db.claim
      .update({ where: { id: claimId }, data: { status: previousStatus === "ANALYZING" ? "SUBMITTED" : previousStatus } })
      .catch(() => {});
    throw err;
  }
}
