"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "for your first 25 claims",
    features: ["Full 6-stage agent pipeline", "1 organization, up to 3 seats", "Email support"],
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$399",
    period: "/ month, per line of business",
    features: [
      "Unlimited claims",
      "Up to 25 seats",
      "Human review queue & audit trail",
      "Real-time notifications",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "Custom",
    period: "for multi-brand carriers",
    features: ["Unlimited seats & organizations", "Custom agent tuning", "SSO & SOC 2 report", "Dedicated success manager"],
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-clarity-100 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-midnight-500">Pricing</p>
          <h2 className="font-display text-4xl font-medium tracking-tight text-pond-500 sm:text-5xl">
            Priced like the work it saves you.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={cn(
                "flex flex-col rounded-2xl p-8",
                t.highlighted
                  ? "bg-pond-500 text-clarity-100 shadow-pond ring-1 ring-pond-400"
                  : "bg-clarity-200 text-pond-500 ring-1 ring-pond-100"
              )}
            >
              {t.highlighted && (
                <span className="mb-4 w-fit rounded-full bg-rosy-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pond-600">
                  Most adopted
                </span>
              )}
              <h3 className="font-display text-xl font-medium">{t.name}</h3>
              <div className="mt-4">
                <span className="font-display text-4xl">{t.price}</span>
              </div>
              <p className={cn("mt-1 text-sm", t.highlighted ? "text-clarity-100/70" : "text-pond-400")}>{t.period}</p>

              <ul className="mt-8 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", t.highlighted ? "text-moss-200" : "text-moss-500")} />
                    <span className={t.highlighted ? "text-clarity-100/90" : "text-pond-500/85"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                href="/signup"
                variant={t.highlighted ? "secondary" : "outline"}
                className={cn("mt-8", !t.highlighted && "border-pond-200 text-pond-500 hover:bg-pond-50")}
              >
                {t.id === "scale" ? "Talk to sales" : "Start free"}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
