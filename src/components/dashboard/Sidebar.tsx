"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileStack,
  ClipboardCheck,
  BarChart3,
  Settings,
  Droplets,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/claims", label: "Claims", icon: FileStack },
  { href: "/dashboard/reviews", label: "Human review", icon: ClipboardCheck },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between bg-pond-500 px-5 py-7 text-clarity-100 lg:flex">
      <div>
        <Link href="/" className="mb-10 flex items-center gap-2 px-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rosy-300" />
          <span className="font-display text-lg font-medium">ClarityClaim</span>
        </Link>

        <nav className="space-y-1">
          {nav.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-clarity-100/10 text-clarity-100" : "text-clarity-100/60 hover:bg-clarity-100/5 hover:text-clarity-100"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-xl bg-clarity-100/5 p-4 text-xs text-clarity-100/60">
        <div className="mb-2 flex items-center gap-2 text-moss-200">
          <Droplets className="h-3.5 w-3.5" />
          <span className="font-medium">Clarity, settling</span>
        </div>
        <p>Every claim's full agent reasoning is retained for audit, indefinitely.</p>
      </div>
    </aside>
  );
}
