// Ports the original Streamlit app's multi-agent pipeline
// (agents/document_agent.py, vision_agent.py, audio_agent.py,
// contradiction_engine.py, debate_engine.py, adjudicator.py,
// missing_evidence_agent.py) into typed pipeline stages callable
// from a Next.js API route / background worker.
//
// Uses Google Gemini's free API (via its OpenAI-compatible endpoint)
// instead of a paid provider, so this runs at zero cost. Get a free key
// at aistudio.google.com and set GEMINI_API_KEY in .env.

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export type AgentStage =
  | "DOCUMENT_AGENT"
  | "VISION_AGENT"
  | "AUDIO_AGENT"
  | "CONTRADICTION_ENGINE"
  | "DEBATE_ENGINE"
  | "ADJUDICATOR"
  | "MISSING_EVIDENCE_AGENT";

export interface AgentFindingResult {
  agent: AgentStage;
  summary: string;
  confidence: number;
  rawOutput: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAgent(
  stage: AgentStage,
  system: string,
  prompt: string
): Promise<AgentFindingResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set — add a free key from aistudio.google.com to your .env file."
    );
  }

  const maxAttempts = 4;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(GEMINI_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        max_tokens: 512,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text: string = data.choices?.[0]?.message?.content ?? "";

      // Agents are prompted to end with a line "CONFIDENCE: <0-100>"
      const match = text.match(/CONFIDENCE:\s*(\d{1,3})/i);
      const confidence = match
        ? Math.min(100, parseInt(match[1], 10))
        : 70;

      return {
        agent: stage,
        summary: text.split("\n")[0].slice(0, 200),
        confidence,
        rawOutput: text,
      };
    }

    const errText = await response.text();
    lastError = `Gemini API error (${response.status}): ${errText}`;

    // Rate limited — back off and retry
    if (response.status === 429 && attempt < maxAttempts) {
      const waitMatch = errText.match(/try again in ([\d.]+)s/i);
      const waitSeconds = waitMatch ? parseFloat(waitMatch[1]) : 3;
      await sleep(Math.ceil(waitSeconds * 1000) + 500);
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError);
}

export async function runDocumentAgent(documentText: string) {
  return runAgent(
    "DOCUMENT_AGENT",
    "You are the Document Agent in an insurance claim analysis pipeline. Extract key facts, dates, amounts, and policy references from claim documents. Flag anything ambiguous. End with a line 'CONFIDENCE: <0-100>'.",
    `Analyze this claim document text:\n\n${documentText}`
  );
}

export async function runVisionAgent(imageDescription: string) {
  return runAgent(
    "VISION_AGENT",
    "You are the Vision Agent. Assess damage evidence photos for consistency with the claim narrative. End with a line 'CONFIDENCE: <0-100>'.",
    `Evidence photo description / OCR text:\n\n${imageDescription}`
  );
}

export async function runAudioAgent(transcript: string) {
  return runAgent(
    "AUDIO_AGENT",
    "You are the Audio Agent. Review a recorded statement transcript for consistency, tone, and factual detail. End with a line 'CONFIDENCE: <0-100>'.",
    `Statement transcript:\n\n${transcript}`
  );
}

export async function runContradictionEngine(
  findings: AgentFindingResult[]
) {
  return runAgent(
    "CONTRADICTION_ENGINE",
    "You are the Contradiction Engine. Compare findings from other agents and identify direct contradictions between sources (dates, amounts, descriptions). List each contradiction with severity 1-5. End with a line 'CONFIDENCE: <0-100>'.",
    findings.map((f) => `[${f.agent}] ${f.rawOutput}`).join("\n\n---\n\n")
  );
}

export async function runDebateEngine(
  findings: AgentFindingResult[],
  contradictions: AgentFindingResult
) {
  return runAgent(
    "DEBATE_ENGINE",
    "You are the Debate Engine. Argue both the claimant's and the insurer's side using the findings and contradictions provided, then note which side the evidence favors. End with a line 'CONFIDENCE: <0-100>'.",
    `Findings:\n${findings
      .map((f) => f.summary)
      .join("\n")}\n\nContradictions:\n${contradictions.rawOutput}`
  );
}

export async function runAdjudicator(
  allFindings: AgentFindingResult[]
) {
  return runAgent(
    "ADJUDICATOR",
    "You are the Adjudicator, the final decision-making agent. Weigh all findings and issue a recommendation: approve, deny, or escalate to a human reviewer, with a payout amount if approving. Explain your reasoning plainly. End with a line 'CONFIDENCE: <0-100>'.",
    allFindings
      .map(
        (f) =>
          `[${f.agent}] (confidence ${f.confidence}) ${f.rawOutput}`
      )
      .join("\n\n---\n\n")
  );
}

export async function runMissingEvidenceAgent(
  claimSummary: string,
  evidenceList: string[]
) {
  return runAgent(
    "MISSING_EVIDENCE_AGENT",
    "You are the Missing Evidence Agent. Given a claim summary and the evidence already on file, list what additional evidence would materially help resolve the claim faster. End with a line 'CONFIDENCE: <0-100>'.",
    `Claim summary: ${claimSummary}\n\nEvidence on file: ${
      evidenceList.join(", ") || "none"
    }`
  );
}

/**
 * Runs the full sequential pipeline.
 */
export async function runFullPipeline(input: {
  documentText: string;
  imageDescriptions: string[];
  audioTranscripts: string[];
}) {
  const findings: AgentFindingResult[] = [];

  findings.push(await runDocumentAgent(input.documentText));
  await sleep(1500);

  for (const desc of input.imageDescriptions) {
    findings.push(await runVisionAgent(desc));
    await sleep(1500);
  }

  for (const t of input.audioTranscripts) {
    findings.push(await runAudioAgent(t));
    await sleep(1500);
  }

  const contradictions = await runContradictionEngine(findings);
  await sleep(1500);

  const debate = await runDebateEngine(findings, contradictions);
  await sleep(1500);

  const adjudication = await runAdjudicator([
    ...findings,
    contradictions,
    debate,
  ]);

  return { findings, contradictions, debate, adjudication };
}