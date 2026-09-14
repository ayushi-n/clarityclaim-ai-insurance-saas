"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { RippleSignature } from "@/components/ui/RippleSignature";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-pond-500 pb-28 pt-40 text-clarity-100 grain">
      {/* Ambient drifting lily-pad shapes */}
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -left-16 top-24 h-56 w-56 rounded-[45%_55%_60%_40%] bg-moss-500/30 blur-2xl animate-drift" />
        <div className="absolute right-0 top-72 h-72 w-72 rounded-[55%_45%_35%_65%] bg-midnight-500/30 blur-3xl animate-drift [animation-delay:-2s]" />
        <div className="absolute left-1/3 bottom-0 h-40 w-40 rounded-[40%_60%_50%_50%] bg-rosy-300/20 blur-2xl animate-drift [animation-delay:-4s]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-clarity-100/20 bg-clarity-100/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-moss-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Multi-agent AI, human-approved
          </div>

          <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-[4rem]">
            Every claim starts murky.
            <br />
            <span className="text-moss-200">Clarity</span> is the decision.
          </h1>

          <p className="mt-7 max-w-lg text-lg leading-relaxed text-clarity-100/75">
            ClarityClaim runs documents, photos and statements through seven
            specialist agents that cross-examine the evidence, surface every
            contradiction, and hand your adjusters a decision they can
            actually stand behind — in minutes, not weeks.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="/signup" size="lg" className="group">
              Start deciding faster
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button href="#how-it-works" variant="outline" size="lg">
              See the pipeline
            </Button>
          </div>

          <div className="mt-14 flex items-center gap-8 text-sm text-clarity-100/55">
            <div>
              <p className="font-display text-2xl text-clarity-100">4.2 min</p>
              <p>avg. time to first decision</p>
            </div>
            <div className="h-8 w-px bg-clarity-100/15" />
            <div>
              <p className="font-display text-2xl text-clarity-100">31%</p>
              <p>fewer disputed payouts</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative mx-auto w-full max-w-md"
        >
          <RippleSignature className="w-full" />

          {/* Floating claim-status card, settling into view like water clearing */}
          <div className="absolute -bottom-6 left-1/2 w-[88%] -translate-x-1/2 animate-settle rounded-2xl bg-clarity-100 p-5 text-pond-500 shadow-pond [animation-delay:1.1s] [animation-fill-mode:both]">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wide text-pond-400">
              <span>CC-2026-10412</span>
              <span className="rounded-full bg-moss-100 px-2 py-0.5 text-moss-700">Approved</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-pond-400">Clarity score</p>
                <p className="font-display text-3xl">88</p>
              </div>
              <div className="h-10 w-24">
                <svg viewBox="0 0 100 40" className="h-full w-full">
                  <polyline
                    points="0,32 15,28 30,30 45,18 60,20 75,8 100,6"
                    fill="none"
                    stroke="#839958"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
