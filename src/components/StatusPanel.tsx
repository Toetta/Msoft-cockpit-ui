import React from 'react'
export type Severity = "ok" | "warn" | "error" | "offline";
export type SensorStatus = { id:string; label:string; severity:Severity; message?:string; };
const sevStyle=(s:Severity)=>{
  switch(s){
    case "ok": return {dot:"bg-emerald-500", text:"text-slate-300", pulse:""};
    case "warn": return {dot:"bg-amber-400", text:"text-amber-300", pulse:"animate-pulse"};
    case "error": return {dot:"bg-red-500", text:"text-red-300", pulse:"animate-bounce"};
    case "offline": return {dot:"bg-slate-500", text:"text-slate-400", pulse:"opacity-60"};
  }
}
const StatusRow:React.FC<{s:SensorStatus}>=({s})=>{ const st=sevStyle(s.severity); return (
  <div className={`flex items-center gap-2 py-1 ${st.pulse}`}>
    <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`}/>
    <div className={`text-xs ${st.text}`}>{s.label}</div>
    {s.message?<div className="text-xs text-slate-400 truncate max-w-[180px]">· {s.message}</div>:null}
  </div> )}
const StatusPanel:React.FC<{status:SensorStatus[]; fixed?:boolean}>=({status,fixed=true})=>{
  const nonOk=status.filter(s=>s.severity!=="ok"); const ok=status.filter(s=>s.severity==="ok");
  const ordered=[...nonOk,...ok];
  return (<div className={`${fixed?'fixed right-4 top-20':''} w-60 bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur-sm`}>
    <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Sensors</div>
    <div className="max-h-[60vh] overflow-auto pr-1">{ordered.map(s=><StatusRow key={s.id} s={s}/>)}</div>
  </div>)
}
export default StatusPanel
