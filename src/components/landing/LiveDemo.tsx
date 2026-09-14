"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const outcomes = [
  { max: 39, label: "Escalated", note: "Multiple contradictions found — routed straight to a human reviewer.", color: "rosy" },
  { max: 69, label: "Needs evidence", note: "Findings are inconclusive — the Missing Evidence agent requests specific documents.", color: "midnight" },
  { max: 100, label: "Approved", note: "Consistent evidence across every agent — cleared for payout automatically.", color: "moss" },
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  rosy: { bg: "bg-rosy-100", text: "text-rosy-600", ring: "ring-rosy-300" },
  midnight: { bg: "bg-midnight-50", text: "text-midnight-500", ring: "ring-midnight-200" },
  moss: { bg: "bg-moss-50", text: "text-moss-700", ring: "ring-moss-300" },
};

export function LiveDemo() {
  const [score, setScore] = useState(72);
  const outcome = outcomes.find((o) => score <= o.max)!;
  const c = colorMap[outcome.color];

  return (
    <section id="product" className="bg-pond-500 py-28 text-clarity-100">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-moss-200">Try it</p>
          <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Drag the score. Watch the routing change.
          </h2>
          <p className="mt-5 max-w-md text-clarity-100/70">
            Every claim gets a 0–100 clarity score from the Adjudicator. This
            is the exact threshold logic that decides whether a claim pays
            out automatically or lands in a reviewer's queue.
          </p>
        </div>

        <div className="rounded-2xl bg-clarity-100 p-8 text-pond-500 shadow-pond">
          <div className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-wide text-pond-400">
            <span>Clarity score</span>
            <span className="text-2xl font-display text-pond-500">{score}</span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full accent-midnight-500"
            aria-label="Clarity score"
          />

          <div className="mt-3 flex justify-between text-[11px] font-mono text-pond-300">
            <span>0 — contradictory</span>
            <span>100 — airtight</span>
          </div>

          <motion.div
            key={outcome.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`mt-8 rounded-xl ${c.bg} p-5 ring-1 ${c.ring}`}
          >
            <p className={`font-display text-xl ${c.text}`}>{outcome.label}</p>
            <p className="mt-2 text-sm text-pond-500/80">{outcome.note}</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
