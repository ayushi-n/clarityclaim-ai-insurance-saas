import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { runPipelineForClaim } from "@/lib/run-pipeline";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claim = await db.claim.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  try {
    const result = await runPipelineForClaim(params.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}