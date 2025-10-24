export function clamp(n:number,a:number,b:number){ return Math.max(a, Math.min(b,n)); }
export function lerp(a:number,b:number,t:number){ return a + (b-a)*t; }
export function mapRange(x:number,inMin:number,inMax:number,outMin:number,outMax:number){
  const t=(x-inMin)/(inMax-inMin); return lerp(outMin,outMax,clamp(t,0,1));
}
