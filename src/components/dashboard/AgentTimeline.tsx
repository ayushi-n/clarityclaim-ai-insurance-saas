"use client";

import { motion } from "framer-motion";
import { FileSearch, Eye, Mic, GitCompareArrows, MessagesSquare, Gavel } from "lucide-react";

const agentIcons: Record<string, any> = {
  DOCUMENT_AGENT: FileSearch,
  VISION_AGENT: Eye,
  AUDIO_AGENT: Mic,
  CONTRADICTION_ENGINE: GitCompareArrows,
  DEBATE_ENGINE: MessagesSquare,
  ADJUDICATOR: Gavel,
};

const agentLabels: Record<string, string> = {
  DOCUMENT_AGENT: "Document agent",
  VISION_AGENT: "Vision agent",
  AUDIO_AGENT: "Audio agent",
  CONTRADICTION_ENGINE: "Contradiction engine",
  DEBATE_ENGINE: "Debate engine",
  ADJUDICATOR: "Adjudicator",
};

export function AgentTimeline({ findings }: { findings: { agent: string; summary: string; confidence: number }[] }) {
  return (
    <ol className="space-y-0">
      {findings.map((f, i) => {
        const Icon = agentIcons[f.agent] ?? FileSearch;
        const isLast = i === findings.length - 1;
        return (
          <motion.li
            key={f.agent}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="relative flex gap-4 pb-8"
          >
            {!isLast && <span className="absolute left-[19px] top-10 h-full w-px bg-pond-100" />}
            <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-midnight-50 text-midnight-500">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-pond-500">{agentLabels[f.agent] ?? f.agent}</p>
                <span className="font-mono text-xs text-pond-400">{f.confidence}% confidence</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-pond-400">{f.summary}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
