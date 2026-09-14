"use client";

import { motion } from "framer-motion";
import { WaveDivider } from "@/components/ui/WaveDivider";

const stages = [
  {
    n: "01",
    title: "Documents & evidence land",
    body: "Policy docs, damage photos, repair estimates and recorded statements are uploaded once, in any format.",
    agent: "Intake",
  },
  {
    n: "02",
    title: "Document, Vision & Audio agents read in parallel",
    body: "Three specialists extract facts from paperwork, assess photos against the reported damage, and check statements for consistency.",
    agent: "Document · Vision · Audio",
  },
  {
    n: "03",
    title: "The Contradiction Engine cross-examines everything",
    body: "Every fact is checked against every other fact — a repair date that predates the incident, a mismatched VIN, a statement that contradicts a photo.",
    agent: "Contradiction Engine",
  },
  {
    n: "04",
    title: "The Debate Engine argues both sides",
    body: "One pass argues for the claimant, one argues for the insurer, so the final call isn't a single model's first instinct.",
    agent: "Debate Engine",
  },
  {
    n: "05",
    title: "The Adjudicator recommends a decision",
    body: "Approve, deny, or escalate — with a plain-language rationale and a clarity score your team can audit line by line.",
    agent: "Adjudicator",
  },
  {
    n: "06",
    title: "A human signs off on anything below threshold",
    body: "Low-confidence or high-value claims route straight to a reviewer's queue. Nothing pays out without a person who can be held accountable.",
    agent: "Human review",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-clarity-200 py-28">
      <WaveDivider fill="#0A3323" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-midnight-500">
            The pipeline
          </p>
          <h2 className="font-display text-4xl font-medium tracking-tight text-pond-500 sm:text-5xl">
            Six stages between a filed claim and a decision you'd defend.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-pond-100 md:grid-cols-2 lg:grid-cols-3">
          {stages.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group flex flex-col bg-clarity-200 p-8 transition-colors hover:bg-clarity-100"
            >
              <span className="font-display text-3xl text-moss-400 transition-colors group-hover:text-rosy-400">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-xl font-medium text-pond-500">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-pond-400">{s.body}</p>
              <span className="mt-6 inline-block w-fit rounded-full bg-midnight-50 px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-midnight-500">
                {s.agent}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
