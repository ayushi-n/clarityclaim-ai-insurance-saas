// ClarityClaim multi-agent pipeline, powered by Google Gemini.
//
// Every agent receives the REAL evidence: uploaded PDFs, photos, audio and
// video are downloaded on the server and passed to Gemini as file parts
// (inline for small files, via the Gemini Files API for large files and all
// video). Each agent answers in a fixed JSON shape, and the final clarity
// score is computed from the evidence (coverage, cross-source consistency,
// contradictions, agent agreement) rather than an AI grading itself.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com";
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024; // larger files go through the Files API

export type AgentStage =
  | "DOCUMENT_AGENT"
  | "VISION_AGENT"
  | "VIDEO_AGENT"
  | "AUDIO_AGENT"
  | "MISSING_EVIDENCE_AGENT"
  | "CONTRADICTION_ENGINE"
  | "DEBATE_ENGINE"
  | "ADJUDICATOR";

export type EvidenceKind = "DOCUMENT" | "IMAGE" | "AUDIO" | "VIDEO";

export interface EvidenceInput {
  type: EvidenceKind;
  fileName: string;
  fileUrl: string;
}

export interface ClaimInput {
  claimNumber: string;
  claimantName: string;
  policyNumber: string;
  incidentType: string;
  incidentDate: string; // ISO date
  description: string;
  claimedAmount: number;
}

/** One agent's result, in the shape stored as an AgentFinding row. */
export interface AgentFindingResult {
  agent: AgentStage;
  /** Short human-readable summary shown in the pipeline trace. */
  summary: string;
  /** 0-100: how consistent this source is with the claim (not self-graded certainty). */
  confidence: number;
  /** Full structured output, stored as JSON for the audit trail. */
  rawOutput: string;
  /** Parsed structured output. */
  data: Record<string, any>;
  /** Set when the agent could not run (e.g. file unreadable). */
  failed?: boolean;
  fileName?: string;
}

export interface Contradiction {
  sourceA: string;
  sourceB: string;
  description: string;
  severity: number; // 1-5
}

export interface ScoreBreakdown {
  coverage: number; // 0-25
  consistency: number; // 0-35
  contradictions: number; // 0-25
  agreement: number; // 0-15
  total: number; // 0-100
  notes: string[];
}

export interface PipelineResult {
  findings: AgentFindingResult[];
  missingEvidence: AgentFindingResult;
  contradictions: AgentFindingResult;
  contradictionList: Contradiction[];
  debate: AgentFindingResult;
  adjudication: AgentFindingResult;
  outcome: "approve" | "deny" | "escalate";
  recommendedPayout: number | null;
  requiresHuman: boolean;
  score: ScoreBreakdown;
}

// ---------------------------------------------------------------------------
// Gemini plumbing
// ---------------------------------------------------------------------------

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } };

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set — add a key from aistudio.google.com in Vercel's Environment Variables.");
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
  webm: "video/webm",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
};

export function guessMimeType(fileName: string, headerType?: string | null): string {
  const clean = headerType?.split(";")[0].trim();
  if (clean && clean !== "application/octet-stream" && clean !== "binary/octet-stream") return clean;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}

/** Uploads bytes to the Gemini Files API and waits until the file is ready. */
async function uploadToGeminiFiles(bytes: Buffer, mimeType: string, displayName: string): Promise<string> {
  const start = await fetch(`${API_BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey(),
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName.slice(0, 100) } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) {
    throw new Error(`Gemini file upload could not start (${start.status}): ${await start.text()}`);
  }

  const done = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(bytes),
  });
  if (!done.ok) throw new Error(`Gemini file upload failed (${done.status}): ${await done.text()}`);
  const { file } = (await done.json()) as { file: { name: string; uri: string; state?: string } };

  // Video (and sometimes audio) needs server-side processing before use.
  let state = file.state;
  for (let i = 0; i < 40 && state && state !== "ACTIVE"; i++) {
    if (state === "FAILED") throw new Error(`Gemini could not process ${displayName}.`);
    await sleep(3000);
    const res = await fetch(`${API_BASE}/v1beta/${file.name}`, { headers: { "x-goog-api-key": apiKey() } });
    if (res.ok) state = ((await res.json()) as { state?: string }).state;
  }
  if (state && state !== "ACTIVE") throw new Error(`Timed out waiting for Gemini to process ${displayName}.`);
  return file.uri;
}

/** Downloads one uploaded evidence file and turns it into a Gemini content part. */
export async function evidenceToPart(evidence: EvidenceInput): Promise<Part> {
  const res = await fetch(evidence.fileUrl);
  if (!res.ok) throw new Error(`Could not download ${evidence.fileName} (${res.status}).`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const mimeType = guessMimeType(evidence.fileName, res.headers.get("content-type"));

  if (evidence.type === "VIDEO" || bytes.length > INLINE_LIMIT_BYTES) {
    const fileUri = await uploadToGeminiFiles(bytes, mimeType, evidence.fileName);
    return { fileData: { mimeType, fileUri } };
  }
  return { inlineData: { mimeType, data: bytes.toString("base64") } };
}

/** Pulls the first JSON object out of a model reply (tolerates code fences). */
export function parseJsonReply(text: string): Record<string, any> {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The AI reply was not valid JSON.");
  }
}

/** One Gemini call that must return JSON matching `schema`. Retries on rate limits and transient errors. */
async function callGemini(system: string, parts: Part[], schema: Record<string, any>): Promise<Record<string, any>> {
  const url = `${API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const maxAttempts = 5;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text: string = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      if (!text) {
        lastError = `Gemini returned an empty reply (${data.candidates?.[0]?.finishReason ?? "unknown reason"}).`;
      } else {
        try {
          return parseJsonReply(text);
        } catch (err) {
          lastError = (err as Error).message;
        }
      }
    } else {
      const errText = await response.text();
      lastError = `Gemini API error (${response.status}): ${errText.slice(0, 500)}`;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) throw new Error(lastError);
      const waitMatch = errText.match(/(?:try again in|retryDelay"?:\s*"?)([\d.]+)s/i);
      const waitMs = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) + 500 : 2000 * attempt;
      if (attempt < maxAttempts) await sleep(Math.min(waitMs, 30000));
      continue;
    }
    if (attempt < maxAttempts) await sleep(1000 * attempt);
  }
  throw new Error(lastError);
}

/** Runs async jobs with limited parallelism (keeps us under free-tier rate limits). */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Schemas (Gemini OpenAPI-style responseSchema)
// ---------------------------------------------------------------------------

const S = {
  str: { type: "STRING" },
  int: { type: "INTEGER" },
  num: { type: "NUMBER" },
  bool: { type: "BOOLEAN" },
  strList: { type: "ARRAY", items: { type: "STRING" } },
};

const evidenceSchema = {
  type: "OBJECT",
  properties: {
    summary: S.str,
    observations: S.strList,
    supportsClaim: S.strList,
    redFlags: S.strList,
    extractedFacts: {
      type: "OBJECT",
      properties: {
        dates: S.strList,
        amounts: S.strList,
        locations: S.strList,
        people: S.strList,
        policyNumbers: S.strList,
      },
    },
    evidenceQuality: S.int,
    consistencyScore: S.int,
  },
  required: ["summary", "observations", "redFlags", "evidenceQuality", "consistencyScore"],
};

const missingSchema = {
  type: "OBJECT",
  properties: {
    summary: S.str,
    missingItems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { item: S.str, why: S.str, priority: { type: "STRING", enum: ["high", "medium", "low"] } },
        required: ["item", "why", "priority"],
      },
    },
    sufficientToDecide: S.bool,
  },
  required: ["summary", "missingItems", "sufficientToDecide"],
};

const contradictionSchema = {
  type: "OBJECT",
  properties: {
    summary: S.str,
    contradictions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { sourceA: S.str, sourceB: S.str, description: S.str, severity: S.int },
        required: ["sourceA", "sourceB", "description", "severity"],
      },
    },
  },
  required: ["summary", "contradictions"],
};

const debateSchema = {
  type: "OBJECT",
  properties: {
    claimantCase: S.strList,
    insurerCase: S.strList,
    favors: { type: "STRING", enum: ["claimant", "insurer", "unclear"] },
    strength: S.int,
    summary: S.str,
  },
  required: ["claimantCase", "insurerCase", "favors", "strength", "summary"],
};

const adjudicatorSchema = {
  type: "OBJECT",
  properties: {
    outcome: { type: "STRING", enum: ["approve", "deny", "escalate"] },
    recommendedPayout: S.num,
    reasoning: S.str,
    keyFactors: S.strList,
    conditions: S.strList,
  },
  required: ["outcome", "recommendedPayout", "reasoning", "keyFactors"],
};

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

const GROUNDING =
  "Base every statement ONLY on the material provided. Never invent facts, dates or amounts. " +
  "If something cannot be determined from the evidence, say so explicitly. " +
  "Scores are integers 0-100. consistencyScore = how well THIS evidence matches the claim as filed " +
  "(100 = fully consistent, 50 = cannot tell / not relevant, 0 = directly contradicts it). " +
  "evidenceQuality = how readable, complete and relevant the evidence is.";

function claimContext(c: ClaimInput): string {
  return [
    `Claim number: ${c.claimNumber}`,
    `Claimant: ${c.claimantName}`,
    `Policy number: ${c.policyNumber}`,
    `Incident type: ${c.incidentType}`,
    `Incident date: ${c.incidentDate.slice(0, 10)}`,
    `Claimed amount: ₹${c.claimedAmount.toLocaleString("en-IN")}`,
    `Claimant's description: ${c.description}`,
  ].join("\n");
}

const PERCEPTION_PROMPTS: Record<EvidenceKind, { stage: AgentStage; system: string }> = {
  DOCUMENT: {
    stage: "DOCUMENT_AGENT",
    system:
      "You are the Document Agent in an insurance claim review pipeline. Read the attached document (policy, invoice, " +
      "repair estimate, police/medical report, etc.). Extract dates, amounts, names, locations and policy numbers exactly as written. " +
      "Check whether the document supports the claim as filed (date, incident type, amount, policy number) and flag any mismatch, " +
      "missing signature/stamp, or sign of alteration. " + GROUNDING,
  },
  IMAGE: {
    stage: "VISION_AGENT",
    system:
      "You are the Vision Agent in an insurance claim review pipeline. Examine the attached photo. Describe exactly what is visible: " +
      "the object/property, the type, location and extent of damage, and any visible date stamps or identifiers. Judge whether the " +
      "damage is consistent with the incident type and description, whether the damage looks old/pre-existing, and whether the image " +
      "shows signs of editing, being a screenshot, or being a stock/internet photo. " + GROUNDING,
  },
  VIDEO: {
    stage: "VIDEO_AGENT",
    system:
      "You are the Video Agent in an insurance claim review pipeline. Watch the attached video (and listen to its audio track). " +
      "Describe what happens with approximate timestamps, the damage or events shown, and anything said. Judge whether it is " +
      "consistent with the incident type and description and flag signs of staging, editing or reused footage. " + GROUNDING,
  },
  AUDIO: {
    stage: "AUDIO_AGENT",
    system:
      "You are the Audio Agent in an insurance claim review pipeline. Listen to the attached recorded statement. In summary, " +
      "give a short transcript-style account of what is said. Extract stated dates, times, amounts, places and people. Compare " +
      "the statement with the written claim and flag inconsistencies, hesitation on key facts, or details that change during the " +
      "recording. Do not judge accent, language or emotion as evidence of dishonesty. " + GROUNDING,
  },
};

function bulletSummary(data: Record<string, any>): string {
  const flags: string[] = Array.isArray(data.redFlags) ? data.redFlags.filter(Boolean) : [];
  const base = String(data.summary ?? "").trim();
  const flagText = flags.length ? ` Red flags: ${flags.slice(0, 3).join("; ")}.` : " No red flags found.";
  return (base + flagText).slice(0, 700);
}

function clampScore(n: unknown, fallback = 50): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Runs the right perception agent (document / vision / video / audio) on one evidence file. */
export async function runPerceptionAgent(claim: ClaimInput, evidence: EvidenceInput): Promise<AgentFindingResult> {
  const { stage, system } = PERCEPTION_PROMPTS[evidence.type];
  try {
    const filePart = await evidenceToPart(evidence);
    const data = await callGemini(
      system,
      [
        { text: `CLAIM AS FILED\n${claimContext(claim)}\n\nEVIDENCE FILE: ${evidence.fileName}` },
        filePart,
      ],
      evidenceSchema
    );
    return {
      agent: stage,
      summary: `${evidence.fileName}: ${bulletSummary(data)}`.slice(0, 800),
      confidence: clampScore(data.consistencyScore),
      rawOutput: JSON.stringify({ fileName: evidence.fileName, ...data }),
      data,
      fileName: evidence.fileName,
    };
  } catch (err) {
    const message = (err as Error).message;
    return {
      agent: stage,
      summary: `${evidence.fileName}: could not be analyzed — ${message.slice(0, 200)}`,
      confidence: 0,
      rawOutput: JSON.stringify({ fileName: evidence.fileName, error: message }),
      data: { error: message },
      failed: true,
      fileName: evidence.fileName,
    };
  }
}

function findingsDigest(findings: AgentFindingResult[]): string {
  return findings
    .map((f) => `[${f.agent}${f.fileName ? ` · ${f.fileName}` : ""}] consistency=${f.confidence}\n${f.rawOutput}`)
    .join("\n\n---\n\n");
}

export async function runMissingEvidenceAgent(
  claim: ClaimInput,
  evidence: EvidenceInput[],
  findings: AgentFindingResult[]
): Promise<AgentFindingResult> {
  const data = await callGemini(
    "You are the Missing Evidence Agent. Given the claim and what the evidence agents found, list the specific additional " +
      "evidence that would materially help decide this claim (for this incident type), with priority. Set sufficientToDecide " +
      "to true only if the current evidence is enough for a fair decision. " + GROUNDING,
    [
      {
        text:
          `CLAIM\n${claimContext(claim)}\n\nEVIDENCE ON FILE\n` +
          (evidence.map((e) => `- ${e.type}: ${e.fileName}`).join("\n") || "none") +
          `\n\nAGENT FINDINGS\n${findingsDigest(findings)}`,
      },
    ],
    missingSchema
  );
  const items: { item: string; priority: string }[] = Array.isArray(data.missingItems) ? data.missingItems : [];
  const high = items.filter((i) => i.priority === "high").length;
  return {
    agent: "MISSING_EVIDENCE_AGENT",
    summary: (
      String(data.summary ?? "") +
      (items.length ? ` Requested: ${items.slice(0, 4).map((i) => `${i.item} (${i.priority})`).join("; ")}.` : "")
    ).slice(0, 700),
    confidence: data.sufficientToDecide ? Math.max(40, 100 - high * 20) : Math.max(0, 60 - high * 15),
    rawOutput: JSON.stringify(data),
    data,
  };
}

export async function runContradictionEngine(
  claim: ClaimInput,
  findings: AgentFindingResult[]
): Promise<{ finding: AgentFindingResult; list: Contradiction[] }> {
  const data = await callGemini(
    "You are the Contradiction Engine. Compare the claim as filed with every agent's findings and with each other. List each " +
      "DIRECT contradiction between two sources (dates, times, amounts, damage described vs shown, people, places). Name the " +
      "sources concretely (e.g. 'Claim form', 'repair_estimate.pdf', 'Audio statement'). Severity: 1 = trivial, 3 = material, " +
      "5 = strongly suggests the claim is false. Do not list missing information as a contradiction. Return an empty list if none. " +
      GROUNDING,
    [{ text: `CLAIM AS FILED\n${claimContext(claim)}\n\nAGENT FINDINGS\n${findingsDigest(findings)}` }],
    contradictionSchema
  );
  const list: Contradiction[] = (Array.isArray(data.contradictions) ? data.contradictions : [])
    .filter((c: any) => c && c.description)
    .map((c: any) => ({
      sourceA: String(c.sourceA ?? "Unknown").slice(0, 120),
      sourceB: String(c.sourceB ?? "Unknown").slice(0, 120),
      description: String(c.description).slice(0, 600),
      severity: Math.max(1, Math.min(5, Math.round(Number(c.severity) || 1))),
    }));
  const penalty = list.reduce((sum, c) => sum + c.severity * 10, 0);
  return {
    finding: {
      agent: "CONTRADICTION_ENGINE",
      summary: (list.length
        ? `${list.length} contradiction(s) found. ${String(data.summary ?? "")}`
        : `No direct contradictions found. ${String(data.summary ?? "")}`
      ).slice(0, 700),
      confidence: Math.max(0, 100 - penalty),
      rawOutput: JSON.stringify(data),
      data,
    },
    list,
  };
}

export async function runDebateEngine(
  claim: ClaimInput,
  findings: AgentFindingResult[],
  contradictions: Contradiction[]
): Promise<AgentFindingResult> {
  const data = await callGemini(
    "You are the Debate Engine. Build the strongest honest case for the claimant (pay the claim) and for the insurer " +
      "(deny or investigate), using only the findings and contradictions provided. Then say which side the evidence favors " +
      "and how strongly (strength 0-100, where 50 = evenly balanced). " + GROUNDING,
    [
      {
        text:
          `CLAIM\n${claimContext(claim)}\n\nFINDINGS\n${findingsDigest(findings)}\n\nCONTRADICTIONS\n` +
          (contradictions.map((c) => `- (${c.severity}/5) ${c.sourceA} vs ${c.sourceB}: ${c.description}`).join("\n") || "none"),
      },
    ],
    debateSchema
  );
  const favors = String(data.favors ?? "unclear");
  const strength = clampScore(data.strength);
  return {
    agent: "DEBATE_ENGINE",
    summary: `Evidence favors the ${favors === "unclear" ? "neither side clearly" : favors} (strength ${strength}). ${String(data.summary ?? "")}`.slice(0, 700),
    confidence: favors === "claimant" ? strength : favors === "insurer" ? 100 - strength : 50,
    rawOutput: JSON.stringify(data),
    data,
  };
}

export async function runAdjudicator(
  claim: ClaimInput,
  all: AgentFindingResult[],
  score: ScoreBreakdown
): Promise<AgentFindingResult> {
  const data = await callGemini(
    "You are the Adjudicator, the final recommending agent. Weigh every finding and recommend approve, deny, or escalate " +
      "(to a human reviewer). Approve only when the evidence supports the claim; the payout must not exceed the claimed amount " +
      "and should be reduced for any part not supported by evidence. Deny only when evidence clearly contradicts the claim. " +
      "Escalate when evidence is insufficient, conflicting, or fraud indicators exist. Explain the reasoning plainly for an " +
      "adjuster, citing the specific evidence. recommendedPayout is 0 for deny/escalate. " + GROUNDING,
    [
      {
        text:
          `CLAIM\n${claimContext(claim)}\n\nCOMPUTED CLARITY SCORE: ${score.total}/100 ` +
          `(coverage ${score.coverage}/25, consistency ${score.consistency}/35, contradictions ${score.contradictions}/25, agreement ${score.agreement}/15)` +
          `\n\nALL FINDINGS\n${findingsDigest(all)}`,
      },
    ],
    adjudicatorSchema
  );
  return {
    agent: "ADJUDICATOR",
    summary: `Recommends ${String(data.outcome ?? "escalate").toUpperCase()}. ${String(data.reasoning ?? "")}`.slice(0, 800),
    confidence: score.total,
    rawOutput: JSON.stringify(data),
    data,
  };
}

// ---------------------------------------------------------------------------
// Scoring — computed from the evidence, not self-reported by the model
// ---------------------------------------------------------------------------

export function computeClarityScore(input: {
  evidence: EvidenceInput[];
  perception: AgentFindingResult[];
  contradictions: Contradiction[];
  debate?: AgentFindingResult;
  missingEvidence?: AgentFindingResult;
}): ScoreBreakdown {
  const notes: string[] = [];
  const ok = input.perception.filter((f) => !f.failed);
  const has = (t: EvidenceKind) => input.evidence.some((e) => e.type === t);

  // 1. Coverage (0-25): the right kinds of evidence exist and were readable.
  let coverage = 0;
  if (has("DOCUMENT")) coverage += 10;
  else notes.push("No supporting document uploaded.");
  if (has("IMAGE") || has("VIDEO")) coverage += 10;
  else notes.push("No photo or video of the damage/incident.");
  if (has("AUDIO") || has("VIDEO")) coverage += 5;
  const failed = input.perception.length - ok.length;
  if (failed > 0) {
    coverage = Math.max(0, coverage - failed * 5);
    notes.push(`${failed} file(s) could not be analyzed.`);
  }
  const missingItems: any[] = input.missingEvidence?.data?.missingItems ?? [];
  const highMissing = missingItems.filter((i) => i?.priority === "high").length;
  if (highMissing) {
    coverage = Math.max(0, coverage - Math.min(10, highMissing * 3));
    notes.push(`${highMissing} high-priority evidence item(s) still missing.`);
  }

  // 2. Consistency (0-35): quality-weighted average of each source's consistency with the claim.
  let consistency = 0;
  if (ok.length) {
    let weighted = 0;
    let weights = 0;
    for (const f of ok) {
      const w = Math.max(10, clampScore(f.data?.evidenceQuality, 50));
      weighted += f.confidence * w;
      weights += w;
    }
    consistency = Math.round(((weighted / weights) / 100) * 35);
  } else {
    notes.push("No evidence could be analyzed, so consistency is unknown.");
  }

  // 3. Contradictions (0-25): start full, subtract by severity.
  const penalty = input.contradictions.reduce((sum, c) => sum + c.severity * 4, 0);
  const contradictions = Math.max(0, 25 - penalty);
  if (input.contradictions.length) notes.push(`${input.contradictions.length} contradiction(s) between sources.`);

  // 4. Agreement (0-15): red flags across agents + which side the debate favors.
  const redFlags = ok.reduce((n, f) => n + (Array.isArray(f.data?.redFlags) ? f.data.redFlags.length : 0), 0);
  let agreement = Math.max(0, 10 - redFlags * 2);
  const favors = input.debate?.data?.favors;
  const strength = clampScore(input.debate?.data?.strength, 50);
  if (favors === "claimant") agreement += Math.round((strength / 100) * 5);
  else if (favors === "insurer") agreement = Math.max(0, agreement - Math.round((strength / 100) * 5));
  else agreement += 2;
  agreement = Math.min(15, agreement);
  if (redFlags) notes.push(`${redFlags} red flag(s) raised by the evidence agents.`);

  const total = Math.max(0, Math.min(100, coverage + consistency + contradictions + agreement));
  return { coverage, consistency, contradictions, agreement, total, notes };
}

// ---------------------------------------------------------------------------
// Full pipeline
// ---------------------------------------------------------------------------

export const HUMAN_REVIEW_THRESHOLD = 70;

export async function runFullPipeline(claim: ClaimInput, evidence: EvidenceInput[]): Promise<PipelineResult> {
  // Stage 1 — perception agents read every file (2 at a time to respect rate limits).
  const findings = await mapWithConcurrency(evidence, 2, (e) => runPerceptionAgent(claim, e));

  // If there is no evidence at all, still let the reasoning agents look at the claim form.
  const missingEvidence = await runMissingEvidenceAgent(claim, evidence, findings);
  const { finding: contradictions, list: contradictionList } = await runContradictionEngine(claim, findings);
  const debate = await runDebateEngine(claim, findings, contradictionList);

  const score = computeClarityScore({ evidence, perception: findings, contradictions: contradictionList, debate, missingEvidence });
  const adjudication = await runAdjudicator(claim, [...findings, missingEvidence, contradictions, debate], score);

  let outcome = (["approve", "deny", "escalate"].includes(adjudication.data.outcome)
    ? adjudication.data.outcome
    : "escalate") as PipelineResult["outcome"];

  // Safety rules: never auto-approve on weak or conflicting evidence.
  const severe = contradictionList.some((c) => c.severity >= 4);
  const requiresHuman = score.total < HUMAN_REVIEW_THRESHOLD || severe || findings.length === 0 || outcome === "escalate";
  if (outcome === "approve" && (severe || score.total < HUMAN_REVIEW_THRESHOLD)) outcome = "escalate";

  const rawPayout = Number(adjudication.data.recommendedPayout);
  const recommendedPayout =
    outcome === "approve" && Number.isFinite(rawPayout) && rawPayout > 0 ? Math.min(rawPayout, claim.claimedAmount) : null;

  return {
    findings,
    missingEvidence,
    contradictions,
    contradictionList,
    debate,
    adjudication,
    outcome,
    recommendedPayout,
    requiresHuman,
    score,
  };
}
