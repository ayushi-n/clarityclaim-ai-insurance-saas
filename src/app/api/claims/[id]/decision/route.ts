import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  outcome: z.enum(["approve", "deny", "escalate"]),
  payoutAmount: z.number().optional(),
  reasoning: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claim = await db.claim.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { outcome, payoutAmount, reasoning } = parsed.data;

  if (outcome === "escalate") {
    await db.claim.update({ where: { id: claim.id }, data: { status: "ESCALATED" } });
    await db.humanReview.create({
      data: { claimId: claim.id, reviewerId: session.user.id, decision: "PENDING", notes: reasoning },
    });
  } else {
    await db.claim.update({
      where: { id: claim.id },
      data: { status: outcome === "approve" ? "APPROVED" : "DENIED" },
    });
    await db.decision.upsert({
      where: { claimId: claim.id },
      update: { outcome, payoutAmount, reasoning: reasoning ?? "", confidence: claim.clarityScore ?? 0 },
      create: {
        claimId: claim.id,
        outcome,
        payoutAmount,
        reasoning: reasoning ?? "",
        confidence: claim.clarityScore ?? 0,
      },
    });
  }

  await db.notification.create({
    data: {
      organizationId: session.user.organizationId,
      claimId: claim.id,
      message: `Claim ${claim.claimNumber} was ${outcome === "approve" ? "approved" : outcome === "deny" ? "denied" : "escalated to review"} by ${session.user.name}.`,
    },
  });

  return NextResponse.json({ ok: true });
}
