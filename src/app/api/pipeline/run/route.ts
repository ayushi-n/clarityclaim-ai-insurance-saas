import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { runPipelineForClaim } from "@/lib/run-pipeline";

async function handler(req: Request) {
  const { claimId } = await req.json();

  try {
    const result = await runPipelineForClaim(claimId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export const POST = process.env.QSTASH_TOKEN ? verifySignatureAppRouter(handler) : handler;