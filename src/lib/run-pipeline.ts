import { db } from "@/lib/db";
import { runFullPipeline } from "@/lib/anthropic-pipeline";

/**
 * Runs the full six-agent pipeline for a claim and writes every result
 * back to the database: findings, the final decision, and a notification.
 * Shared by the QStash worker route and the direct "Send to the
 * pipeline" button, so there's exactly one place this logic lives.
 */
export async function runPipelineForClaim(claimId: string) {
  const claim = await db.claim.findUnique({ where: { id: claimId }, include: { evidence: true } });
  if (!claim) throw new Error("Claim not found");

  await db.claim.update({ where: { id: claimId }, data: { status: "ANALYZING" } });

  const documents = claim.evidence.filter((e: any) => e.type === "DOCUMENT").map((e: any) => e.fileName);
  const images = claim.evidence.filter((e: any) => e.type === "IMAGE").map((e: any) => e.fileName);
  const audio = claim.evidence.filter((e: any) => e.type === "AUDIO").map((e: any) => e.fileName);

  const result = await runFullPipeline({
    documentText: `${claim.description}\n\nDocuments on file: ${documents.join(", ") || "none"}`,
    imageDescriptions: images,
    audioTranscripts: audio,
  });

  const allFindings = [...result.findings, result.contradictions, result.debate, result.adjudication];
  await db.agentFinding.createMany({
    data: allFindings.map((f) => ({
      claimId,
      agent: f.agent as any,
      summary: f.summary,
      confidence: f.confidence,
      rawOutput: f.rawOutput,
    })),
  });

  const outcomeMatch = result.adjudication.rawOutput.match(/\b(approve|deny|escalate)\b/i);
  const outcome = (outcomeMatch?.[1]?.toLowerCase() ?? "escalate") as "approve" | "deny" | "escalate";
  const clarityScore = result.adjudication.confidence;

  await db.claim.update({
    where: { id: claimId },
    data: {
      clarityScore,
      status: clarityScore < 70 ? "IN_REVIEW" : outcome === "approve" ? "APPROVED" : outcome === "deny" ? "DENIED" : "ESCALATED",
    },
  });

  await db.decision.upsert({
    where: { claimId },
    update: { outcome, reasoning: result.adjudication.rawOutput, confidence: clarityScore, requiresHuman: clarityScore < 70 },
    create: {
      claimId,
      outcome,
      reasoning: result.adjudication.rawOutput,
      confidence: clarityScore,
      requiresHuman: clarityScore < 70,
    },
  });

  await db.notification.create({
    data: {
      organizationId: claim.organizationId,
      claimId,
      message: `Claim ${claim.claimNumber} finished analysis — clarity score ${clarityScore}.`,
    },
  });

  return { ok: true, clarityScore, outcome };
}