"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-midnight-700 py-28 text-clarity-100">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute left-1/4 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-moss-500/30 blur-3xl animate-drift" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-2xl px-6 text-center"
      >
        <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Stop guessing which claims need a second look.
        </h2>
        <p className="mt-5 text-clarity-100/70">
          Set up your first line of business in under ten minutes. No card required for the first 25 claims.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Button href="/signup" size="lg" className="group">
            Create your workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button href="/login" variant="outline" size="lg">
            Log in
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-pond-600 py-14 text-clarity-100/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-sm sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rosy-300" />
          <span className="font-display text-clarity-100">ClarityClaim</span>
        </div>
        <p>© {new Date().getFullYear()} ClarityClaim, Inc. Claims decided as clearly as they were filed.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-clarity-100">Privacy</a>
          <a href="#" className="hover:text-clarity-100">Terms</a>
          <a href="#" className="hover:text-clarity-100">Status</a>
        </div>
      </div>
    </footer>
  );
}
