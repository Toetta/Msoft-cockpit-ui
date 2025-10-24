import React, { useEffect, useRef, useState } from 'react'
import Gauge from './Gauge'
import StatusPanel, { SensorStatus } from './StatusPanel'

type Telemetry = { speed_mps:number; disk_mb_s:number; pps_skew_us:number; queue_pct:number; gnss_lock:number; temp_c:number; status?:SensorStatus[] }

const DEFAULT:Telemetry = { speed_mps:0, disk_mb_s:0, pps_skew_us:0, queue_pct:0, gnss_lock:0, temp_c:0, status:[] }

function useTelemetryREST(url:string|null, intervalMs=500, fallback?:()=>Telemetry){
  const [data,setData]=useState<Telemetry|null>(null); const [ok,setOk]=useState(false); const abortRef=useRef<AbortController|null>(null);
  useEffect(()=>{ if(!url){ if(fallback) setData(fallback()); setOk(false); return; } let mounted=true;
    const tick=async()=>{ try{ abortRef.current?.abort(); const ctrl=new AbortController(); abortRef.current=ctrl;
      const res=await fetch(url,{signal:ctrl.signal, cache:'no-store'}); if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const j=await res.json(); if(!mounted) return;
      const mapped:Telemetry = {
        speed_mps:Number(j.speed_mps ?? j.speed ?? 0),
        disk_mb_s:Number(j.disk_mb_s ?? j.disk ?? 0),
        pps_skew_us:Number(j.pps_skew_us ?? j.pps ?? 0),
        queue_pct:Number(j.queue_pct ?? j.queue ?? 0),
        gnss_lock:Number(j.gnss_lock ?? j.gnss ?? 0),
        temp_c:Number(j.temp_c ?? j.temp ?? 0),
        status:Array.isArray(j.status)?j.status:undefined,
      }; setData(mapped); setOk(true);
    }catch{ if(fallback) setData(fallback()); setOk(false); } }
    const id=setInterval(tick,intervalMs); tick(); return ()=>{ mounted=false; clearInterval(id); abortRef.current?.abort(); }
  },[url,intervalMs]);
  return {data, ok} as const;
}

const useMock=()=>{ const [t,setT]=useState(0); useEffect(()=>{ const id=setInterval(()=>setT(v=>v+0.1),100); return ()=>clearInterval(id);},[]);
  const s=(f:number,amp=1,offs=0)=> offs + amp*Math.sin(t*f);
  return {
    speed_mps: 15 + 5*s(0.4),
    disk_mb_s: 350 + 120*s(0.27),
    pps_skew_us: Math.abs(30*s(0.6,1,0)),
    queue_pct: Math.max(0, Math.min(100, 40 + 30*s(0.33))),
    gnss_lock: Math.max(0, Math.min(1, 0.85 + 0.12*s(0.2))),
    temp_c: 50 + 10*s(0.18),
    status: [
      { id:'ins', label:'GNSS/INS', severity:'ok', message:'Mock' },
      { id:'recorder', label:'Recorder', severity:'ok' },
    ]
  } as Telemetry;
}

const Card:React.FC<{title:string; children:React.ReactNode}>=({title,children})=>(
  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
    <div className="text-slate-300 text-xs font-semibold mb-2 tracking-widest uppercase">{title}</div>{children}
  </div>
)

const Dashboard:React.FC<{data?:Partial<Telemetry>; telemetryUrl?:string}>=({data,telemetryUrl})=>{
  const mock=useMock();
  const {data:live, ok}=useTelemetryREST(telemetryUrl ?? (typeof window!=='undefined' ? (window as any).__TELEM_URL ?? null : null), 500, ()=>mock);
  const d:Telemetry = {...DEFAULT, ...(ok ? (live||{}) : mock), ...(data||{})};

  const defaultStatus:SensorStatus[]=[
    { id:'dmi', label:'DMI (Wheel Pulse)', severity:'ok' },
    { id:'ins', label:'GNSS/INS', severity: d.gnss_lock>0.7?'ok': d.gnss_lock>0.4?'warn':'error', message:`Lock ${Math.floor(d.gnss_lock*100)}%` },
    { id:'vux1a', label:'LiDAR VUX1-A', severity:'ok' },
    { id:'vux1b', label:'LiDAR VUX1-B', severity:'ok' },
    { id:'gpr', label:'GPR AIR', severity:'ok' },
    { id:'cam_f0', label:'Camera Front 0', severity:'ok' },
    { id:'cam_r0', label:'Camera Rear 0', severity:'ok' },
    { id:'profiler', label:'AT Profiler', severity:'ok' },
    { id:'recorder', label:'Recorder', severity: d.queue_pct<80?'ok': d.queue_pct<90?'warn':'error', message:`${Math.round(d.queue_pct)}% queue` },
    { id:'storage', label:'Storage', severity: d.disk_mb_s<700?'ok':'warn', message:`${Math.round(d.disk_mb_s)} MB/s` },
    { id:'thermal', label:'Thermals', severity: d.temp_c<70?'ok': d.temp_c<85?'warn':'error', message:`${Math.round(d.temp_c)}°C` },
  ];
  const status = (d.status && Array.isArray(d.status) && d.status.length) ? d.status : defaultStatus;

  return (<div className="min-h-screen w-full bg-slate-950 text-slate-100 p-6">
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold tracking-tight">msoft Cockpit</h1>
      <div className={`text-xs px-2 py-1 rounded-full border ${ok?'border-emerald-500 text-emerald-400':'border-amber-500 text-amber-400'}`}>{ok?'LIVE':'MOCK'}</div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card title="Speed">
        <Gauge label="km/h" value={d.speed_mps*3.6} min={0} max={140} centerValue={80}
          goodRange={{from:50,to:110}} warnRange={{from:30,to:130}} badRange={{from:0,to:25}}
          format={(v)=>String(Math.round(v))}/>
      </Card>
      <Card title="Disk Throughput">
        <Gauge label="MB/s" value={d.disk_mb_s} min={0} max={800} centerValue={400}
          goodRange={{from:250,to:600}} warnRange={{from:150,to:700}} badRange={{from:0,to:120}}
          format={(v)=>String(Math.round(v))}/>
      </Card>
      <Card title="PPS Skew">
        <Gauge label="µs" value={d.pps_skew_us} min={0} max={200} centerValue={0}
          goodRange={{from:0,to:40}} warnRange={{from:40,to:100}} badRange={{from:100,to:200}}
          format={(v)=>String(Math.round(v))}/>
      </Card>
      <Card title="Queues">
        <Gauge label="%" value={d.queue_pct} min={0} max={100} centerValue={30}
          goodRange={{from:10,to:60}} warnRange={{from:60,to:80}} badRange={{from:80,to:100}}
          format={(v)=>String(Math.round(v))}/>
      </Card>
      <Card title="GNSS Lock">
        <Gauge label="CN0" value={d.gnss_lock*50+20} min={20} max={70} centerValue={55}
          goodRange={{from:45,to:70}} warnRange={{from:35,to:45}} badRange={{from:20,to:35}}
          format={(v)=>String(Math.round(v))}/>
      </Card>
      <Card title="Chassis Temp">
        <Gauge label="°C" value={d.temp_c} min={0} max={100} centerValue={55}
          goodRange={{from:20,to:70}} warnRange={{from:70,to:85}} badRange={{from:85,to:100}}
          format={(v)=>String(Math.round(v))}/>
      </Card>
    </div>
    <StatusPanel status={status} fixed/>
  </div>)
}
export default Dashboard
