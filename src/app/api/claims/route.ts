import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  claimantName: z.string().min(1),
  policyNumber: z.string().min(1),
  incidentType: z.string().min(1),
  incidentDate: z.string(),
  description: z.string().min(1),
  claimedAmount: z.number().positive(),
});

function generateClaimNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `CC-${year}-${rand}`;
}

// GET /api/claims — every claim belonging to the caller's organization.
// Optional ?status=APPROVED etc. to filter.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status");

  const claims = await db.claim.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { evidence: true, contradictions: true } } },
  });

  return NextResponse.json({ claims });
}

// POST /api/claims — creates the claim only. The agent pipeline is
// triggered separately once evidence has been uploaded — see
// POST /api/claims/[id]/analyze, called by the "Send to the pipeline"
// button — so agents never analyze a claim before its evidence exists.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const claim = await db.claim.create({
    data: {
      ...parsed.data,
      incidentDate: new Date(parsed.data.incidentDate),
      organizationId: session.user.organizationId,
      claimNumber: generateClaimNumber(),
      status: "SUBMITTED",
    },
  });

  await db.notification.create({
    data: {
      organizationId: session.user.organizationId,
      claimId: claim.id,
      message: `Claim ${claim.claimNumber} was submitted.`,
    },
  });

  return NextResponse.json({ claim }, { status: 201 });
}