import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claim = await db.claim.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      evidence: true,
      findings: { orderBy: { createdAt: "asc" } },
      contradictions: true,
      decision: true,
      humanReviews: { include: { reviewer: true } },
    },
  });

  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ claim });
}
