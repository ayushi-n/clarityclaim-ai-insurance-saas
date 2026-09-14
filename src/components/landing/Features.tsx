"use client";

import { motion } from "framer-motion";
import { FileSearch, Eye, Mic, GitCompareArrows, Users, Bell } from "lucide-react";

const features = [
  { icon: FileSearch, title: "Document agent", body: "Reads policy PDFs, invoices and estimates, and flags anything outside the coverage window." },
  { icon: Eye, title: "Vision agent", body: "Checks damage photos against the claim narrative — a dented bumper should look like a dented bumper." },
  { icon: Mic, title: "Audio agent", body: "Reviews recorded statements for consistency in dates, sequence and tone." },
  { icon: GitCompareArrows, title: "Contradiction engine", body: "Surfaces the exact sentence-level conflicts between sources, with a severity score." },
  { icon: Users, title: "Human review queue", body: "Anything below your confidence threshold routes to a reviewer, never straight to payout." },
  { icon: Bell, title: "Real-time notifications", body: "Adjusters see status changes the moment they happen — no refreshing a spreadsheet." },
];

export function Features() {
  return (
    <section id="trust" className="bg-clarity-200 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-midnight-500">Built for adjusters</p>
            <h2 className="font-display text-4xl font-medium tracking-tight text-pond-500 sm:text-5xl">
              Every finding is explainable, down to the source.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-pond-400">
            No black-box score. Every agent's raw reasoning is stored on the
            claim so a reviewer — or a regulator — can see exactly why a
            decision was made.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
              className="rounded-2xl border border-pond-100 bg-clarity-100 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-midnight-50 text-midnight-500">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-medium text-pond-500">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-pond-400">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
