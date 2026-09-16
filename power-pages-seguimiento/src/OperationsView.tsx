import { useEffect, useState } from "react";
import type { Vehicle } from "./types";
import * as XLSX from "xlsx";
import "./operations.css";

type Props = { mode: "modulation" | "workday"; vehicles: Vehicle[]; date: string; close: () => void; save: (vehicle: Vehicle, changes: Partial<Vehicle>) => Promise<void> };

export function OperationsView({ mode, vehicles, date, close, save }: Props) {
  const [selectedDate, setSelectedDate] = useState(date);
  const [query, setQuery] = useState("");
  const [until, setUntil] = useState(date);
  const [status, setStatus] = useState("");
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  const rows = vehicles.filter(v => (!selectedDate || v.dispatchDate >= selectedDate) && (!until || v.dispatchDate <= until) && (!status || v.status === status) && `${v.plate} ${v.dt} ${v.responsible}`.toLowerCase().includes(query.toLowerCase()));
  const total = rows.reduce((sum,v)=>sum+(v.modulatedBoxes??0),0);
  const managedTotal = rows.reduce((sum,v)=>sum+(v.managedBoxes??0),0);
  function exportRows(){const book=XLSX.utils.book_new();const data=rows.map(v=>({Fecha:v.dispatchDate,Vehículo:v.plate,DT:v.dt,Responsable:v.responsible,Estado:v.status,Carga:v.boxes,"Cajas moduladas":v.modulatedBoxes??"","Cajas gestionadas":v.managedBoxes??"",Salida:v.departureTime,Relevo:v.reliefTime??"",Relevador:v.reliefResponsible??""}));XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(data),"Detalle");XLSX.writeFile(book,`${mode}-${selectedDate||"historico"}.xlsx`);}
  return <main className={`operations-page operations-${mode}`}>
    <header className="operations-header"><div><button onClick={close}>← <span>Portal</span></button><span className="operations-module">{mode === "modulation" ? "▣ Módulo de modulación" : "◷ Jornada laboral"}</span></div></header>
    <section className="operations-content">
      <div className="operations-heading"><div><p className="operations-eyebrow">{mode === "modulation" ? "Módulo interno" : "Módulo operativo"}</p><h1>{mode === "modulation" ? "Modulaciones por día" : "Jornada laboral"}</h1><p>{mode === "modulation" ? "Consulta, filtra y actualiza las cajas moduladas y gestionadas de la operación." : "Control de tiempos de ruta, relevos y alertas SIF."}</p></div><div className="operations-count"><span>Registros visibles</span><strong>{rows.length}</strong></div></div>
      <div className="operations-filters"><select aria-label="Estado operativo" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos los estados</option>{[...new Set(vehicles.map(v=>v.status))].map(s=><option key={s}>{s}</option>)}</select><input aria-label="Buscar ruta" placeholder="Buscar por DT, vehículo o responsable" value={query} onChange={e=>setQuery(e.target.value)}/><input aria-label="Fecha desde" type="date" value={selectedDate} max={until||undefined} onChange={e=>setSelectedDate(e.target.value)}/><input aria-label="Fecha hasta" type="date" value={until} min={selectedDate||undefined} onChange={e=>setUntil(e.target.value)}/><button className="operations-primary" onClick={()=>{const d=new Date();const local=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;setSelectedDate(local);setUntil(local)}}>Hoy</button><button onClick={()=>{setSelectedDate("");setUntil("")}}>Todas</button></div>
      <div className="operations-stats">{(mode === "modulation" ? [["Cajas moduladas",total],["Cajas gestionadas",managedTotal],["Cajas pendientes",Math.max(total-managedTotal,0)],["Gestión",total?`${(managedTotal/total*100).toFixed(1)}%`:"Sin datos"]] : [["Rutas",rows.length],["Relevadas",rows.filter(v=>v.reliefTime).length],["En ruta",rows.filter(v=>v.status==="En ruta").length],["Meta de relevo","10 h 30 min"]]).map(([label,value])=><div key={label}><span>{label}</span><strong>{typeof value === "number"?value.toLocaleString("es-CO",{maximumFractionDigits:2}):value}</strong></div>)}</div>
      <section className="operations-table-shell"><div className="operations-table-heading"><div><h2>{mode === "modulation" ? "Tabla de modulaciones" : "Control de jornada por ruta"}</h2><p>{selectedDate||"Inicio"} a {until||"todos los días"}{mode === "workday" ? " · Alerta SIF a las 13 horas" : ""}</p></div><button disabled={!rows.length} onClick={exportRows}>↓ Exportar Excel</button></div><div className="operations-table-scroll"><table><thead><tr>{["Vehículo / DT", "Responsable", "Estado", ...(mode === "modulation" ? ["Carga", "Cajas moduladas", "Cajas gestionadas"] : ["Salida", "Tiempo / alerta", "Hora relevo", "Relevador"]), "Acciones"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(v=><OperationRow key={`${mode}-${v.key}`} vehicle={v} mode={mode} now={now} save={save}/>)}{!rows.length&&<tr><td colSpan={mode === "modulation" ? 7 : 8} className="operations-empty">No hay registros para los filtros seleccionados.</td></tr>}</tbody></table></div></section>
    </section></main>;
}

function OperationRow({vehicle:v, mode, now, save}: {vehicle:Vehicle; mode:Props["mode"]; now:Date; save:Props["save"]}) {
  const [modulated, setModulated] = useState(v.modulatedBoxes?.toString() ?? "");
  const [managed, setManaged] = useState(v.managedBoxes?.toString() ?? "");
  const [relief, setRelief] = useState(v.reliefTime ?? "");
  const [responsible, setResponsible] = useState(v.reliefResponsible ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(()=>{setModulated(v.modulatedBoxes?.toString()??"");setManaged(v.managedBoxes?.toString()??"");setRelief(v.reliefTime??"");setResponsible(v.reliefResponsible??"")},[v.modulatedBoxes,v.managedBoxes,v.reliefTime,v.reliefResponsible]);
  const start = clockSeconds(v.departureTime);
  const end = clockSeconds(v.reliefTime || v.arrivalTime) ?? now.getHours()*3600+now.getMinutes()*60+now.getSeconds();
  const elapsed = start === null ? null : (end-start+86400)%86400;
  const label = elapsed === null ? "Sin salida" : `${Math.floor(elapsed/3600)} h ${Math.floor(elapsed%3600/60)} min · ${v.reliefTime ? "Relevada" : v.arrivalTime ? "Finalizada" : elapsed>=13*3600 ? "Alerta SIF" : elapsed>=10.5*3600 ? "Requiere relevo" : "En tiempo"}`;
  async function submit() {
    setMessage("");
    if(mode === "modulation" && ((modulated !== "" && (!Number.isFinite(Number(modulated)) || Number(modulated)<0 || Number(modulated)>v.boxes)) || (managed !== "" && (!Number.isFinite(Number(managed)) || Number(managed)<0 || modulated==="" || Number(managed)>Number(modulated))))) {setMessage("Revisa las cajas: gestión ≤ modulación ≤ carga.");return;}
    setBusy(true);
    try {await save(v,mode === "modulation" ? {modulatedBoxes:modulated===""?undefined:Number(modulated),managedBoxes:managed===""?undefined:Number(managed)} : {reliefTime:relief,reliefResponsible:responsible.trim()});setMessage("Guardado");}
    catch(error){setMessage(error instanceof Error ? error.message : "No se pudo guardar");}
    finally{setBusy(false);}
  }
  const input="w-28 rounded-md border border-slate-300 p-2 disabled:opacity-50";
  return <tr className="border-b border-slate-100 align-top"><td className="p-3"><b>{v.plate}</b><small className="block">{v.dt}</small></td><td className="p-3">{v.responsible||"Sin responsable"}</td><td className="p-3">{v.status}</td>{mode === "modulation" ? <><td className="p-3">{v.boxes}</td><td className="p-3"><input aria-label={`Cajas moduladas ${v.dt}`} type="number" min="0" max={v.boxes} value={modulated} disabled={busy} onChange={e=>setModulated(e.target.value)} className={input}/></td><td className="p-3"><input aria-label={`Cajas gestionadas ${v.dt}`} type="number" min="0" max={modulated} value={managed} disabled={busy} onChange={e=>setManaged(e.target.value)} className={input}/></td></> : <><td className="p-3">{v.departureTime||"Sin salida"}</td><td className={`p-3 ${elapsed!==null&&elapsed>=13*3600?"font-semibold text-red-700":""}`}>{label}</td><td className="p-3"><input aria-label={`Hora relevo ${v.dt}`} type="time" value={relief} disabled={busy} onChange={e=>setRelief(e.target.value)} className={input}/></td><td className="p-3"><input aria-label={`Relevador ${v.dt}`} value={responsible} disabled={busy} onChange={e=>setResponsible(e.target.value)} className={input}/></td></>}<td className="p-3"><button disabled={busy} onClick={()=>void submit()} className="rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{busy?"Guardando…":"Guardar"}</button><p role="status" className="mt-2 max-w-48 text-xs">{message}</p></td></tr>;
}

function clockSeconds(value:string|undefined) {const match=value?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!match||Number(match[1])>23||Number(match[2])>59||Number(match[3]||0)>59)return null;return Number(match[1])*3600+Number(match[2])*60+Number(match[3]||0);}
