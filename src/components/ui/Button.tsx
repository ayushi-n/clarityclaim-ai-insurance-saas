import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  href?: string;
}

const variants = {
  primary: "bg-pond-500 text-clarity-100 hover:bg-pond-600 shadow-soft",
  secondary: "bg-rosy-300 text-pond-600 hover:bg-rosy-400",
  ghost: "bg-transparent text-pond-500 hover:bg-pond-50",
  outline: "bg-transparent text-clarity-100 border border-clarity-100/40 hover:bg-clarity-100/10",
};

const sizes = {
  sm: "text-sm px-4 py-2",
  md: "text-[15px] px-5 py-2.5",
  lg: "text-base px-7 py-3.5",
};

export function Button({ variant = "primary", size = "md", className, href, children, ...props }: ButtonProps) {
  const classes = cn(
    "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 ease-out active:scale-[0.97]",
    variants[variant],
    sizes[size],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
