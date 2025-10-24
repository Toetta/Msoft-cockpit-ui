import React, { useMemo } from "react";

/* tiny helpers */
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;

/** Map value in [min,max] to angle in [start,end] (deg). 0° = up. */
function valueToAngle(v: number, min: number, max: number, startDeg: number, endDeg: number) {
  if (!(Number.isFinite(v) && Number.isFinite(min) && Number.isFinite(max)) || max <= min) return 0;
  const t = clamp((v - min) / (max - min), 0, 1);
  return lerp(startDeg, endDeg, t);
}

/** Polar to cartesian around local origin (0,0). 0° = up. */
function polar(angDeg: number, radius: number) {
  const a = (angDeg - 90) * (Math.PI / 180);
  return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
}

export type Range = { from: number; to: number };

export type GaugeProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  /** total angular span (deg), symmetric around up; default 240° → ±120° */
  spanDeg?: number;
  /** major tick count (incl. min/max) */
  ticks?: number;
  /** value formatter */
  format?: (v: number) => string;
  /** optional bands */
  goodRange?: Range;
  warnRange?: Range;
  badRange?: Range;
};

const Gauge: React.FC<GaugeProps> = ({
  label,
  value,
  min,
  max,
  unit,
  spanDeg = 240,
  ticks = 7,
  format,
  goodRange,
  warnRange,
  badRange,
}) => {
  // Dial center is (0,0) by design via centered viewBox.
  const rDial = 78;   // tick/band radius
  const rBezel = 92;  // outer ring
  const start = -spanDeg / 2;
  const end   =  spanDeg / 2;

  // Deterministic angle for needle
  const angle = useMemo(() => valueToAngle(value, min, max, start, end), [value, min, max, start, end]);

  // Band path between angles [a1,a2]
  const bandPath = (fromDeg: number, toDeg: number, rOuter = rDial, width = 8) => {
    const a = Math.min(fromDeg, toDeg), b = Math.max(fromDeg, toDeg);
    const large = (b - a) > 180 ? 1 : 0;
    const p1o = polar(a, rOuter), p2o = polar(b, rOuter);
    const p1i = polar(a, rOuter - width), p2i = polar(b, rOuter - width);
    return `M ${p1o.x} ${p1o.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2o.x} ${p2o.y}
            L ${p2i.x} ${p2i.y} A ${rOuter - width} ${rOuter - width} 0 ${large} 0 ${p1i.x} ${p1i.y} Z`;
  };

  const band = (rng?: Range, color = "#22c55e") => {
    if (!rng) return null;
    const a1 = valueToAngle(rng.from, min, max, start, end);
    const a2 = valueToAngle(rng.to,   min, max, start, end);
    return <path d={bandPath(a1, a2)} fill={color} opacity={0.25} />;
  };

  // Status color for numeric readout
  const statusColor = (() => {
    const v = value;
    if (badRange && (v < badRange.from || v > badRange.to)) return "#ef4444";
    if (warnRange && (v < warnRange.from || v > warnRange.to)) return "#f59e0b";
    return "#22c55e";
  })();

  // Major ticks + labels
  const majorTicks = Array.from({ length: Math.max(2, ticks) }, (_, i) => {
    const t = i / (ticks - 1);
    const v = lerp(min, max, t);
    const a = lerp(start, end, t);
    const p1 = polar(a, rDial);
    const p2 = polar(a, rDial - 10);
    const pt = polar(a, rDial - 18);
    return (
      <g key={i}>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeWidth={2} />
        <text x={pt.x} y={pt.y} fill="#94a3b8" fontSize={9} textAnchor="middle" dominantBaseline="central">
          {format ? format(v) : Math.round(v)}
        </text>
      </g>
    );
  });

  return (
    <div className="relative aspect-square w-full max-w-[240px] select-none">
      {/* Centered viewBox: origin (0,0) = ring center. */}
      <svg viewBox="-100 -100 200 200" className="w-full h-full drop-shadow-sm">
        {/* bezel (outer) + your thin reference ring (concentric) */}
        <circle cx="0" cy="0" r={rBezel} fill="#0b1220" stroke="#1f2937" strokeWidth={2} />
        <circle cx="0" cy="0" r={rDial - 22} fill="none" stroke="#e5e7eb" strokeWidth={0.8} opacity={0.15} />

        {/* bands & ticks */}
        {band(goodRange, "#22c55e")}
        {band(warnRange, "#f59e0b")}
        {band(badRange,  "#ef4444")}
        {majorTicks}

        {/* up tick and center hub */}
        <line x1="0" y1={-rDial} x2="0" y2={-rDial + 8} stroke="#64748b" strokeWidth={2} />
        <circle cx="0" cy="0" r="4" fill="#111827" stroke="#94a3b8" />

        {/* NEEDLE — drawn UP from origin, rotated around (0,0) */}
        <g transform={`rotate(${Number.isFinite(angle) ? angle : 0})`}>
          <line x1="0" y1="10" x2="0" y2="-60" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
          <circle cx="0" cy="0" r="6" fill="#0b1220" stroke="#e5e7eb" />
        </g>

        {/* label & numeric readout */}
        <text x="0" y="36" fill="#e5e7eb" fontWeight={600} fontSize={12} textAnchor="middle">{label}</text>
        <text x="0" y="52" fill={statusColor} fontSize={12} textAnchor="middle">
          {format ? format(value) : value.toFixed(0)}{unit ? ` ${unit}` : ""}
        </text>
      </svg>
    </div>
  );
};

export default Gauge;
