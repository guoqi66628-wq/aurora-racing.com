import { useId } from "react";

// Circuit paths adapted from the animation supplied for the login page.
const traces = [
  { d: "M100 100 H200 V210 H326", x: 100, y: 100, color: "purple" },
  { d: "M80 180 H180 V230 H326", x: 80, y: 180, color: "blue" },
  { d: "M60 260 H150 V250 H326", x: 60, y: 260, color: "amber" },
  { d: "M100 350 H200 V270 H326", x: 100, y: 350, color: "green" },
  { d: "M700 90 H560 V210 H474", x: 700, y: 90, color: "blue" },
  { d: "M740 160 H580 V230 H474", x: 740, y: 160, color: "green" },
  { d: "M720 250 H590 V250 H474", x: 720, y: 250, color: "red" },
  { d: "M680 340 H570 V270 H474", x: 680, y: 340, color: "amber" },
];

export default function TelemetryCircuit() {
  const id = useId().replace(/:/g, "");

  return (
    <div className="telemetry-circuit">
      <svg viewBox="30 60 740 320" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-chip`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34333b" />
            <stop offset="100%" stopColor="#141319" />
          </linearGradient>
          <linearGradient id={`${id}-pins`}>
            <stop offset="0%" stopColor="#bdbac5" />
            <stop offset="100%" stopColor="#77737f" />
          </linearGradient>
        </defs>
        {traces.map((trace) => (
          <g key={trace.d} className={`telemetry-trace-${trace.color}`}>
            <path d={trace.d} className="telemetry-trace-bg" />
            <path d={trace.d} className="telemetry-trace-flow" />
            <circle cx={trace.x} cy={trace.y} r="5" fill="black" />
          </g>
        ))}
        {[322, 470].flatMap((x) => [205, 225, 245, 265].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" rx="2" fill={`url(#${id}-pins)`} />
        )))}
        <rect x="330" y="190" width="140" height="100" rx="24" fill={`url(#${id}-chip)`} className="telemetry-chip-body" />
        <rect x="338" y="198" width="124" height="84" rx="18" stroke="#ffffff" strokeOpacity=".12" />
        <text x="400" y="241" textAnchor="middle" dominantBaseline="middle" className="telemetry-chip-name">i3pro</text>
      </svg>
    </div>
  );
}
