export function WaveDivider({ fill = "#F7F4D5", flip = false }: { fill?: string; flip?: boolean }) {
  return (
    <div className={flip ? "rotate-180" : ""} aria-hidden="true">
      <svg viewBox="0 0 1440 90" className="block w-full" preserveAspectRatio="none">
        <path
          fill={fill}
          d="M0,32 C240,80 480,0 720,24 C960,48 1200,88 1440,40 L1440,90 L0,90 Z"
        />
      </svg>
    </div>
  );
}
