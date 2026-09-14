"use client";

import Link from "next/link";
import { Droplets } from "lucide-react";

export function MobileNav() {
  return (
    <div className="flex items-center justify-between border-b border-pond-100 bg-pond-500 px-4 py-3 text-clarity-100 lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-rosy-300" />
        <span className="font-display text-base font-medium">ClarityClaim</span>
      </Link>
      <Droplets className="h-4 w-4 text-moss-200" />
    </div>
  );
}
