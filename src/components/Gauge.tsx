import React, { useEffect, useMemo } from 'react'
import { motion, useSpring } from 'framer-motion'
import { clamp, lerp, mapRange } from './utils'
export type Range = { from:number; to:number };
export type GaugeProps = {
  label:string; value:number; min:number; max:number; unit?:string;
  centerValue?:number; goodRange?:Range; warnRange?:Range; badRange?:Range;
  spanDeg?:number; ticks?:number; format?:(v:number)=>string;
};
const Gauge:React.FC<GaugeProps>=({label,value,min,max,unit,centerValue,goodRange,warnRange,badRange,spanDeg=240,ticks=7,format})=>{
  const cx=100, cy=100, r=78; const start=-spanDeg/2, end=spanDeg/2;
  const cVal=useMemo(()=> centerValue??(goodRange?(goodRange.from+goodRange.to)/2:(min+max)/2),[centerValue,goodRange,min,max]);
  const angle=useMemo(()=>{ const span=Math.max(cVal-min,max-cVal); const norm=clamp((value-cVal)/span,-1,1); return mapRange(norm,-1,1,start,end);},[value,min,max,cVal,start,end]);
  const spring=useSpring(angle,{stiffness:140,damping:20,mass:0.5}); useEffect(()=>spring.set(angle),[angle]);
  const toXY=(ang:number,rad=r)=>{ const a=(ang-90)*(Math.PI/180); return {x:cx+rad*Math.cos(a), y:cy+rad*Math.sin(a)}; }
  const arcPath=(f:number,t:number,rad=r,w=8)=>{ const p1o=toXY(f,rad), p2o=toXY(t,rad), p1i=toXY(f,rad-w), p2i=toXY(t,rad-w);
    const large=Math.abs(t-f)>180?1:0; return `M ${p1o.x} ${p1o.y} A ${rad} ${rad} 0 ${large} 1 ${p2o.x} ${p2o.y}
            L ${p2i.x} ${p2i.y} A ${rad-w} ${rad-w} 0 ${large} 0 ${p1i.x} ${p1i.y} Z`; }
  const band=(rng?:Range,color="#16a34a")=>{ if(!rng) return null; const a1=mapRange(rng.from,min,max,start,end), a2=mapRange(rng.to,min,max,start,end);
    const f=Math.min(a1,a2), t=Math.max(a1,a2); return <path d={arcPath(f,t)} fill={color} opacity={0.25}/>; }
  const statusColor=(()=>{ const v=value; if(badRange&&(v<badRange.from||v>badRange.to)) return "#ef4444";
    if(warnRange&&(v<warnRange.from||v>warnRange.to)) return "#f59e0b"; return "#22c55e"; })();
  const major=Array.from({length:ticks},(_,i)=>{ const t=i/(ticks-1), ang=lerp(start,end,t), p1=toXY(ang,r), p2=toXY(ang,r-10), val=lerp(min,max,t);
    return (<g key={i}><line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeWidth={2}/>
      <text x={toXY(ang,r-18).x} y={toXY(ang,r-18).y} fill="#94a3b8" fontSize={9} textAnchor="middle" dominantBaseline="central">
        {format?format(val):Math.round(val)}</text></g>)});
  return (<div className="relative aspect-square w-full max-w-[240px] select-none">
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
      <circle cx={cx} cy={cy} r={92} fill="#0b1220" stroke="#1f2937" strokeWidth={2}/>
      {band(goodRange,"#22c55e")}{band(warnRange,"#f59e0b")}{band(badRange,"#ef4444")}
      {major}<line x1={cx} y1={cy-r} x2={cx} y2={cy-r+8} stroke="#64748b" strokeWidth={2}/>
      <circle cx={cx} cy={cy} r={4} fill="#111827" stroke="#94a3b8"/>
      <motion.g style={{rotate:spring, originX:cx, originY:cy}}>
        <polygon points={`${cx},${cy-60} ${cx-3},${cy+12} ${cx+3},${cy+12}`} fill="#e5e7eb"/>
        <circle cx={cx} cy={cy} r={6} fill="#0b1220" stroke="#e5e7eb"/>
      </motion.g>
      <text x={cx} y={cy+36} fill="#e5e7eb" fontWeight={600} fontSize={12} textAnchor="middle">{label}</text>
      <text x={cx} y={cy+52} fill={statusColor} fontSize={12} textAnchor="middle">{format?format(value):value.toFixed(0)}{unit?` ${unit}`:""}</text>
    </svg></div>);
}
export default Gauge
