import type { Vehicle } from './types';
export type HistoryMode = 'day' | 'week' | 'month';
export function validBoxes(n: unknown): n is number { return typeof n === 'number' && Number.isFinite(n) && n >= 0; }
export function refusalBoxes(v: Vehicle): number | null {
  if (validBoxes(v.checkinBoxes)) return v.checkinBoxes;
  return validBoxes(v.modulatedBoxes) && validBoxes(v.managedBoxes) ? Math.max(0,v.modulatedBoxes-v.managedBoxes) : null;
}
export function refusalSummary(rows: Vehicle[]) {
  const known=rows.filter(v=>refusalBoxes(v)!==null),total=rows.reduce((n,v)=>n+(validBoxes(v.boxes)?v.boxes:0),0);
  const pending=known.reduce((n,v)=>n+refusalBoxes(v)!,0);
  const rejected=rows.filter(v=>validBoxes(v.modulatedBoxes)),managed=rows.filter(v=>validBoxes(v.managedBoxes));
  return {total,pending,known:known.length,routes:rows.length,percentage:total&&known.length?pending/total*100:null,limit:total?Math.floor(total/100)||1:0,complete:rows.length>0&&known.length===rows.length,checkins:rows.filter(v=>validBoxes(v.checkinBoxes)).length,rejected:rejected.length?rejected.reduce((n,v)=>n+v.modulatedBoxes!,0):null,managed:managed.length?managed.reduce((n,v)=>n+v.managedBoxes!,0):null};
}
export function refusalHistory(rows:Vehicle[],mode:HistoryMode){
  const groups=new Map<string,Vehicle[]>();
  for(const v of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(v.dispatchDate))continue;let key=v.dispatchDate;if(mode==='month')key=key.slice(0,7);if(mode==='week'){const d=new Date(`${key}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);key=d.toISOString().slice(0,10)}groups.set(key,[...(groups.get(key)||[]),v])}
  return [...groups].sort(([a],[b])=>b.localeCompare(a)).map(([key,list])=>({key,...refusalSummary(list)}));
}
