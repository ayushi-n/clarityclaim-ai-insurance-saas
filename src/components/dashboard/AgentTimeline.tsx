"use client";

import { motion } from "framer-motion";
import { FileSearch, Eye, Film, Mic, ListChecks, GitCompareArrows, MessagesSquare, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

const agentIcons: Record<string, any> = {
  DOCUMENT_AGENT: FileSearch,
  VISION_AGENT: Eye,
  VIDEO_AGENT: Film,
  AUDIO_AGENT: Mic,
  MISSING_EVIDENCE_AGENT: ListChecks,
  CONTRADICTION_ENGINE: GitCompareArrows,
  DEBATE_ENGINE: MessagesSquare,
  ADJUDICATOR: Gavel,
};

const agentLabels: Record<string, string> = {
  DOCUMENT_AGENT: "Document agent",
  VISION_AGENT: "Vision agent",
  VIDEO_AGENT: "Video agent",
  AUDIO_AGENT: "Audio agent",
  MISSING_EVIDENCE_AGENT: "Missing-evidence agent",
  CONTRADICTION_ENGINE: "Contradiction engine",
  DEBATE_ENGINE: "Debate engine",
  ADJUDICATOR: "Adjudicator",
};

// What the 0-100 number means for each kind of agent.
const scoreLabels: Record<string, string> = {
  DOCUMENT_AGENT: "consistent with claim",
  VISION_AGENT: "consistent with claim",
  VIDEO_AGENT: "consistent with claim",
  AUDIO_AGENT: "consistent with claim",
  MISSING_EVIDENCE_AGENT: "evidence sufficiency",
  CONTRADICTION_ENGINE: "free of contradictions",
  DEBATE_ENGINE: "favours claimant",
  ADJUDICATOR: "clarity score",
};

function scoreTone(n: number) {
  if (n >= 70) return "bg-moss-50 text-moss-700";
  if (n >= 40) return "bg-clarity-200 text-pond-500";
  return "bg-rosy-50 text-rosy-600";
}

export function AgentTimeline({ findings }: { findings: { agent: string; summary: string; confidence: number }[] }) {
  return (
    <ol className="space-y-0">
      {findings.map((f, i) => {
        const Icon = agentIcons[f.agent] ?? FileSearch;
        const isLast = i === findings.length - 1;
        return (
          <motion.li
            key={`${f.agent}-${i}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="relative flex gap-4 pb-8"
          >
            {!isLast && <span className="absolute left-[19px] top-10 h-full w-px bg-pond-100" />}
            <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-midnight-50 text-midnight-500">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-pond-500">{agentLabels[f.agent] ?? f.agent}</p>
                <span className={cn("rounded-full px-2 py-0.5 font-mono text-xs", scoreTone(f.confidence))}>
                  {f.confidence}/100 {scoreLabels[f.agent] ?? ""}
                </span>
              </div>
              <p className="mt-1 break-words text-sm leading-relaxed text-pond-400">{f.summary}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
