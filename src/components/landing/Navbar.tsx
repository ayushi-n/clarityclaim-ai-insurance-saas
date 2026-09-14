"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Trust", href: "#trust" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "py-3" : "py-6"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-full px-6 transition-all duration-500",
          scrolled ? "bg-pond-500/95 py-2.5 shadow-pond backdrop-blur" : "bg-transparent py-1"
        )}
      >
        <a href="#top" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rosy-300" />
          <span className={cn("font-display text-lg font-medium tracking-tight", scrolled ? "text-clarity-100" : "text-pond-500")}>
            ClarityClaim
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                scrolled ? "text-clarity-100/80 hover:text-clarity-100" : "text-pond-500/80 hover:text-pond-500"
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            href="/login"
            variant="ghost"
            size="sm"
            className={scrolled ? "text-clarity-100 hover:bg-clarity-100/10" : "text-pond-500 hover:bg-pond-50"}
          >
            Log in
          </Button>
          <Button href="/signup" variant={scrolled ? "secondary" : "primary"} size="sm">
            Start free
          </Button>
        </div>
      </div>
    </header>
  );
}
