import React, { useEffect, useMemo } from 'react'
import { motion, useSpring } from 'framer-motion'
import { clamp, lerp, mapRange } from './utils'

export type Range = { from: number; to: number };

export type GaugeProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  centerValue?: number;
  goodRange?: Range;
  warnRange?: Range;
  badRange?: Range;
  spanDeg?: number;
  ticks?: number;
  format?: (v: number) => string;
};

const EPS = 1e-6;

const Gauge: React.FC<GaugeProps> = ({
  label, value, min, max, unit, centerValue,
  goodRange, warnRange, badRange, spanDeg = 240, ticks = 7, format
}) => {
  const cx = 100, cy = 100, r = 78;
  const start = -spanDeg / 2, end = spanDeg / 2;

  // robust center
  const cVal = useMemo(() => {
    if (Number.isFinite(centerValue as number)) return centerValue as number;
    if (goodRange) return (goodRange.from + goodRange.to) / 2;
    return (min + max) / 2;
  }, [centerValue, goodRange, min, max]);

  // robust value
  const vSafe = Number.isFinite(value) ? value : cVal;

  // compute angle safely
  const angle = useMemo(() => {
    const span = Math.max(cVal - min, max - cVal);
    const safeSpan = span < EPS ? 1 /* avoid div0 */ : span;
    const norm = clamp((vSafe - cVal) / safeSpan, -1, 1);
    const a = mapRange(norm, -1, 1, start, end);
    return Number.isFinite(a) ? a : 0;
  }, [vSafe, min, max, cVal, start, end]);

  // animated spring with safe target
  const spring = useSpring(angle, { stiffness: 140, damping: 20, mass: 0.5 });
  useEffect(() => {
    spring.set(Number.isFinite(angle) ? angle : 0);
  }, [angle, spring]);

  const toXY = (ang: number, radius = r) => {
    const rad = (ang - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (from: number, to: number, radius = r, width = 8) => {
    const p1o = toXY(from, radius);
    const p2o = toXY(to, radius);
    const p1i = toXY(from, radius - width);
    const p2i = toXY(to, radius - width);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${p1o.x} ${p1o.y} A ${radius} ${radius} 0 ${large} 1 ${p2o.x} ${p2o.y}
            L ${p2i.x} ${p2i.y} A ${radius - width} ${radius - width} 0 ${large} 0 ${p1i.x} ${p1i.y} Z`;
  };

  const bandToArc = (rng?: Range, color = "#16a34a") => {
    if (!rng) return null;
    const a1 = mapRange(rng.from, min, max, start, end);
    const a2 = mapRange(rng.to,   min, max, start, end);
    const f = Math.min(a1, a2), t = Math.max(a1, a2);
    return <path d={arcPath(f, t)} fill={color} opacity={0.25} />;
  };

  const statusColor = (() => {
    const v = vSafe;
    if (badRange && (v < badRange.from || v > badRange.to)) return "#ef4444";
    if (warnRange && (v < warnRange.from || v > warnRange.to)) return "#f59e0b";
    return "#22c55e";
  })();

  const majorTicks = Array.from({ length: ticks }, (_, i) => {
    const t = i / (ticks - 1);
    const ang = lerp(start, end, t);
    const p1 = toXY(ang, r);
    const p2 = toXY(ang, r - 10);
    const val = lerp(min, max, t);
    return (
      <g key={i}>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeWidth={2} />
        <text x={toXY(ang, r - 18).x} y={toXY(ang, r - 18).y} fill="#94a3b8" fontSize={9} textAnchor="middle" dominantBaseline="central">
          {format ? format(val) : Math.round(val)}
        </text>
      </g>
    );
  });

  const angleFinite = Number.isFinite(angle);
  const staticRotate = `rotate(${angleFinite ? angle : 0} ${cx} ${cy})`;

  return (
    <div className="relative aspect-square w-full max-w-[240px] select-none">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
        {/* bezel */}
        <circle cx={cx} cy={cy} r={92} fill="#0b1220" stroke="#1f2937" strokeWidth={2} />
        {/* bands */}
        {bandToArc(goodRange, "#22c55e")}
        {bandToArc(warnRange, "#f59e0b")}
        {bandToArc(badRange,  "#ef4444")}
        {/* scale */}
        {majorTicks}
        {/* center tick (up) */}
        <line x1={cx} y1={cy - r} x2={cx} y2={cy - r + 8} stroke="#64748b" strokeWidth={2} />
        {/* center dot */}
        <circle cx={cx} cy={cy} r={4} fill="#111827" stroke="#94a3b8" />
        {/* needle */}
        <motion.g
          // Ensure SVG origin is respected by Framer Motion:
          style={{ rotate: spring, transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px` }}
          // Also provide a static transform as a safety fallback (when angle becomes NaN):
          transform={staticRotate}
        >
          <polygon points={`${cx},${cy - 60} ${cx - 3},${cy + 12} ${cx + 3},${cy + 12}`} fill="#e5e7eb" />
          <circle cx={cx} cy={cy} r={6} fill="#0b1220" stroke="#e5e7eb" />
        </motion.g>
        {/* label & readout */}
        <text x={cx} y={cy + 36} fill="#e5e7eb" fontWeight={600} fontSize={12} textAnchor="middle">{label}</text>
        <text x={cx} y={cy + 52} fill={statusColor} fontSize={12} textAnchor="middle">
          {format ? format(vSafe) : vSafe.toFixed(0)}{unit ? ` ${unit}` : ""}
        </text>
      </svg>
    </div>
  );
}

export default Gauge
