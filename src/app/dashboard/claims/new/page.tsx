"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/dashboard/Topbar";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui/Button";
import { useUploadThing } from "@/lib/uploadthing";
import { FileText, ImageIcon, Mic, Sparkles, ArrowRight, CheckCircle2, UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "evidence">("details");
  const [submitting, setSubmitting] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claimNumber, setClaimNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hasDocument, setHasDocument] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  async function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      claimantName: String(form.get("claimantName")),
      policyNumber: String(form.get("policyNumber")),
      incidentType: String(form.get("incidentType")),
      incidentDate: String(form.get("incidentDate")),
      claimedAmount: Number(form.get("claimedAmount")),
      description: String(form.get("description")),
    };

    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Couldn't create the claim. Check the fields and try again.");
      return;
    }

    const { claim } = await res.json();
    setClaimId(claim.id);
    setClaimNumber(claim.claimNumber);
    setStep("evidence");
  }

  const [running, setRunning] = useState(false);

  const allEvidenceUploaded = hasDocument && hasPhoto && hasAudio;
  const uploadedCount = [hasDocument, hasPhoto, hasAudio].filter(Boolean).length;

  async function handleSendToPipeline() {
    if (!claimId) return;
    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims/${claimId}/analyze`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "The pipeline failed to run.");
      }
      router.push(`/dashboard/claims/${claimId}`);
    } catch (err) {
      setRunning(false);
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex-1">
      <Topbar title="New claim" subtitle="Documents, photos and statements feed the same pipeline shown on every claim." />

      <div className="mx-auto max-w-5xl p-6">
        {step === "details" && (
          <form onSubmit={handleDetailsSubmit} className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
              <h2 className="font-display text-lg text-pond-500">Claim details</h2>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="claimantName" name="claimantName" label="Claimant name" placeholder="Priya Nair" required />
                <Field id="policyNumber" name="policyNumber" label="Policy number" placeholder="POL-88231" required />
                <Field id="incidentType" name="incidentType" label="Incident type" placeholder="Auto collision" required />
                <Field id="incidentDate" name="incidentDate" label="Incident date" type="date" required />
                <Field id="claimedAmount" name="claimedAmount" label="Claimed amount (₹)" type="number" placeholder="182000" required />
              </div>
              <div className="mt-5 space-y-1.5">
                <label htmlFor="description" className="text-sm font-medium text-pond-500">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  placeholder="What happened, in the claimant's own words…"
                  className="focus-ring w-full rounded-xl border border-pond-100 bg-clarity-100 px-4 py-2.5 text-[15px] text-pond-500 placeholder:text-pond-300 focus:border-midnight-400"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rosy-50 px-4 py-2.5 text-sm text-rosy-600">{error}</div>
            )}

            <Button type="submit" size="lg" disabled={submitting} className="group w-full">
              {submitting ? "Creating claim…" : "Continue to evidence"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>
        )}

        {step === "evidence" && claimId && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-moss-200 bg-moss-50 px-5 py-3 text-sm text-moss-700">
              <span>
                Claim <span className="font-mono font-medium">{claimNumber}</span> created. Upload all three types of
                evidence below to continue.
              </span>
              <span className="font-mono text-xs text-moss-600">{uploadedCount}/3 uploaded</span>
            </div>

            <div>
              <h2 className="font-display text-lg text-pond-500">Evidence</h2>
              <p className="mt-1 text-sm text-pond-400">
                Each type below is required — the matching agent picks it up automatically.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                <EvidenceCard
                  icon={FileText}
                  accent="midnight"
                  title="Document"
                  hint="Policy PDF, repair estimate, police report"
                  uploadPrompt="Upload the claim document"
                  claimId={claimId}
                  done={hasDocument}
                  onDone={() => setHasDocument(true)}
                  onError={(m) => setError(m)}
                />
                <EvidenceCard
                  icon={ImageIcon}
                  accent="moss"
                  title="Photo"
                  hint="Damage photos, before/after shots"
                  uploadPrompt="Upload vehicle images"
                  claimId={claimId}
                  done={hasPhoto}
                  onDone={() => setHasPhoto(true)}
                  onError={(m) => setError(m)}
                />
                <EvidenceCard
                  icon={Mic}
                  accent="rosy"
                  title="Audio statement"
                  hint="Recorded statement from the claimant"
                  uploadPrompt="Upload call recordings or audio description"
                  claimId={claimId}
                  done={hasAudio}
                  onDone={() => setHasAudio(true)}
                  onError={(m) => setError(m)}
                />
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-rosy-50 px-4 py-2.5 text-sm text-rosy-600">{error}</div>
              )}

              {running && (
                <div className="mt-4 rounded-lg bg-midnight-50 px-4 py-2.5 text-sm text-midnight-500">
                  Six agents are running one after another — this usually takes 20-40 seconds. Don't close this tab.
                </div>
              )}
            </div>

            <Button
              size="lg"
              className="group w-full disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!allEvidenceUploaded || running}
              onClick={handleSendToPipeline}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running the agent pipeline…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {allEvidenceUploaded ? "Send to the pipeline" : "Upload all three to continue"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const accentStyles = {
  midnight: {
    iconBg: "bg-midnight-50 text-midnight-500",
    ring: "border-midnight-300",
    glow: "bg-midnight-50/60",
    doneRing: "border-moss-300 bg-moss-50/40",
    activeRing: "border-midnight-500 bg-midnight-50/60",
  },
  moss: {
    iconBg: "bg-moss-50 text-moss-600",
    ring: "border-moss-300",
    glow: "bg-moss-50/60",
    doneRing: "border-moss-300 bg-moss-50/40",
    activeRing: "border-moss-500 bg-moss-50/60",
  },
  rosy: {
    iconBg: "bg-rosy-50 text-rosy-500",
    ring: "border-rosy-300",
    glow: "bg-rosy-50/60",
    doneRing: "border-moss-300 bg-moss-50/40",
    activeRing: "border-rosy-500 bg-rosy-50/60",
  },
} as const;

function EvidenceCard({
  icon: Icon,
  accent,
  title,
  hint,
  uploadPrompt,
  claimId,
  done,
  onDone,
  onError,
}: {
  icon: any;
  accent: keyof typeof accentStyles;
  title: string;
  hint: string;
  uploadPrompt: string;
  claimId: string;
  done: boolean;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const s = accentStyles[accent];
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("claimEvidence", {
    headers: { "x-claim-id": claimId },
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) onDone();
    },
    onUploadError: (e: Error) => onError(`Upload failed: ${e.message}`),
  });

  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setFileName(arr[0].name);
    startUpload(arr);
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-clarity-100 p-5 shadow-soft transition-all duration-300",
        done ? s.doneRing : "border-pond-100 hover:-translate-y-0.5 hover:shadow-pond"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        {done ? (
          <span className="flex items-center gap-1 text-xs font-medium text-moss-600">
            <CheckCircle2 className="h-4 w-4" /> Uploaded
          </span>
        ) : (
          <span className="text-xs font-medium text-rosy-500">Required</span>
        )}
      </div>

      <p className="font-display text-base text-pond-500">{title}</p>
      <p className="mt-1 text-xs text-pond-400">{hint}</p>

      <div className="mt-4 flex-1">
        {done ? (
          <div className={cn("flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed", s.ring, s.glow)}>
            <CheckCircle2 className="h-6 w-6 text-moss-500" />
            {fileName && <p className="max-w-[85%] truncate text-xs text-moss-700">{fileName}</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            disabled={isUploading}
            className={cn(
              "flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-clarity-200/30 px-3 text-center transition-colors disabled:cursor-wait",
              dragActive ? s.activeRing : s.ring
            )}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
              }}
            />
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-pond-400" />
                <span className="text-xs text-pond-400">Uploading…</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-pond-300" />
                <span className="text-xs font-medium text-pond-500">Click to choose a file</span>
                <span className="text-[11px] text-pond-400">{uploadPrompt}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}