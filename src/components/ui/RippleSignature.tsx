"use client";

/**
 * The page's signature element: concentric ripples expanding from a
 * dropped point, echoing "clarity settling out of murky water" — the
 * product's whole thesis (a claim goes in turbulent, a decision comes
 * out clear). Used once, large, in the hero — not scattered everywhere.
 */
export function RippleSignature({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="pondCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F7F4D5" />
            <stop offset="55%" stopColor="#839958" />
            <stop offset="100%" stopColor="#0A3323" />
          </radialGradient>
        </defs>

        {[0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            cx="200"
            cy="200"
            r="60"
            fill="none"
            stroke="#105666"
            strokeWidth="1.5"
            opacity="0.5"
            style={{
              transformOrigin: "200px 200px",
              animation: `clarity-ripple 3.6s cubic-bezier(0.2,0.6,0.35,1) ${i * 0.85}s infinite`,
            }}
          />
        ))}

        <circle cx="200" cy="200" r="46" fill="url(#pondCore)" />
        <circle cx="182" cy="182" r="10" fill="#F7F4D5" opacity="0.55" />
      </svg>

      <style>{`
        @keyframes clarity-ripple {
          0% { r: 44; opacity: 0.55; stroke-width: 2px; }
          100% { r: 190; opacity: 0; stroke-width: 0.5px; }
        }
      `}</style>
    </div>
  );
}
