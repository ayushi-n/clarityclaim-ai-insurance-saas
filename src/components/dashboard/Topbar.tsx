"use client";

import { Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex flex-col gap-4 border-b border-pond-100 bg-clarity-100/80 px-6 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-pond-500">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-pond-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pond-300" />
          <input
            placeholder="Search claims…"
            className="focus-ring w-56 rounded-full border border-pond-100 bg-clarity-100 py-2 pl-9 pr-4 text-sm text-pond-500 placeholder:text-pond-300"
          />
        </div>
        <button className="focus-ring relative rounded-full border border-pond-100 p-2.5 text-pond-500 hover:bg-pond-50" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rosy-400" />
        </button>
        <Button href="/dashboard/claims/new" size="sm">
          <Plus className="h-4 w-4" />
          New claim
        </Button>
      </div>
    </header>
  );
}
