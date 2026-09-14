import { Client } from "@upstash/qstash";

const qstash = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;

/**
 * Enqueues an async job that runs the full agent pipeline for a claim.
 * QStash calls back into POST /api/pipeline/run, which is a plain request
 * handler but is invoked out-of-band — so the 5+ sequential Anthropic
 * calls never block the original "create claim" request.
 *
 * Falls back to firing the request directly (no queue, no retries) when
 * QSTASH_TOKEN isn't set, so local dev works without an Upstash account.
 */
export async function queuePipelineRun(claimId: string) {
  const targetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/pipeline/run`;

  if (!qstash) {
    fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId }),
    }).catch((err) => console.error("Pipeline dispatch failed (no QSTASH_TOKEN set):", err));
    return;
  }

  await qstash.publishJSON({
    url: targetUrl,
    body: { claimId },
    retries: 2,
  });
}
