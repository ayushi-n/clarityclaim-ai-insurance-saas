"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(70);

  return (
    <div className="flex-1">
      <Topbar title="Settings" subtitle="Workspace, thresholds, and team" />

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
          <h2 className="font-display text-lg text-pond-500">Workspace</h2>
          <div className="mt-5 space-y-5">
            <Field id="orgName" label="Organization name" defaultValue="Meridian Mutual" />
            <Field id="orgSlug" label="Workspace URL" defaultValue="meridian-mutual" disabled className="opacity-60" />
          </div>
        </div>

        <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
          <h2 className="font-display text-lg text-pond-500">Auto-approval threshold</h2>
          <p className="mt-1 text-sm text-pond-400">
            Claims scoring at or above this clarity score are approved automatically. Anything below routes to human review.
          </p>
          <div className="mt-5 flex items-center gap-4">
            <input
              type="range"
              min={40}
              max={95}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-midnight-500"
            />
            <span className="w-12 text-right font-mono text-lg text-pond-500">{threshold}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
          <h2 className="font-display text-lg text-pond-500">Notifications</h2>
          <div className="mt-4 space-y-3 text-sm text-pond-500">
            {["New claim submitted", "Claim escalated to review", "Decision reversed on appeal"].map((n) => (
              <label key={n} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                {n}
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-moss-500" />
              </label>
            ))}
          </div>
        </div>

        <Button className="w-full sm:w-auto">Save changes</Button>
      </div>
    </div>
  );
}
