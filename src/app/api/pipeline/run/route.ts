import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { runPipelineForClaim } from "@/lib/run-pipeline";

async function handler(req: NextRequest) {
  const { claimId } = await req.json();

  try {
    const result = await runPipelineForClaim(claimId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.QSTASH_TOKEN) {
    return handler(req);
  }

  if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
    return NextResponse.json(
      { error: "QStash signing keys are not configured" },
      { status: 500 },
    );
  }

  return verifySignatureAppRouter(handler)(req);
}