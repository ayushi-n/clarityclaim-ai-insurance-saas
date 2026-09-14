import { RippleSignature } from "@/components/ui/RippleSignature";
import { ShieldCheck, Sparkles, Users } from "lucide-react";

const points = [
  { icon: ShieldCheck, text: "Every decision comes with a full, auditable reasoning trail." },
  { icon: Users, text: "Low-confidence claims always route to a human reviewer." },
  { icon: Sparkles, text: "Set up your first line of business in under ten minutes." },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-pond-500 p-12 text-clarity-100 lg:flex grain">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-[45%_55%_60%_40%] bg-moss-500/30 blur-3xl animate-drift" />
          <div className="absolute right-0 bottom-10 h-72 w-72 rounded-[55%_45%_35%_65%] bg-midnight-500/30 blur-3xl animate-drift [animation-delay:-3s]" />
        </div>

        <a href="/" className="relative z-10 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rosy-300" />
          <span className="font-display text-lg font-medium">ClarityClaim</span>
        </a>

        <div className="relative z-10 mx-auto w-64">
          <RippleSignature />
        </div>

        <div className="relative z-10 space-y-5">
          <h2 className="max-w-sm font-display text-3xl font-medium leading-tight tracking-tight">
            Claims decided as clearly as they were filed.
          </h2>
          <ul className="space-y-3">
            {points.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-sm text-clarity-100/75">
                <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-moss-200" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center bg-clarity-100 px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
