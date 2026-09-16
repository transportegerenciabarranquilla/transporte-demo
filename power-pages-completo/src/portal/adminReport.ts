
import { CONTRACTORS } from '../app/lib/contractors';
import type { CheckinCajasRegistro } from '../app/lib/checkinStorage';
import type { ModulacionRegistro } from '../app/lib/modulacionStorage';
import type { Vehiculo } from '../app/seguimiento/types';
import { readRecords } from './dataverse';
type Row = { data: Vehiculo; contractor?: string };
type CheckinRow = { data: CheckinCajasRegistro; contractor?: string };
type AdminCheckin = CheckinCajasRegistro & { contratista?: string };
type ModulacionListRow = Partial<Record<keyof ModulacionRegistro, unknown>> & { contractor?: string };
type AdminRefusalComRow = {
  causal: string;
  contractor: string;
  codigoCliente: string;
  com: string;
  date: string;
  dt: string;
  jefeVentas: string;
  nombreCliente: string;
  preventista: string;
  reportadas: number;
  gestionadas: number;
  refusalFinal: number;
};

export async function getAdminReport() {
  const [vehicles, mods, checks] = await Promise.all([readRecords('/api/seguimiento'), readRecords('/api/modulaciones'), readRecords('/api/checkins')]);
  const rows = vehicles.map(data => ({ data, contractor: data.transportista })) as unknown as Row[];
  const modulaciones = mods as unknown as ModulacionRegistro[];
  const checkins = checks as unknown as AdminCheckin[];
    const records = rows.map((row) => {
      const transportista = contractorLabel(row.contractor || row.data.transportista) || row.data.transportista;
      const registrosDt = getModulacionesByDt(modulaciones, row.data.transporte, transportista, getVehicleDate(row.data));
      const checkin = getCheckinByDt(checkins, row.data.transporte, transportista);
      const refusal = summarizeRefusal(registrosDt, Number(row.data.cajas || 0), checkin?.totalCajas);

      return {
        ...row.data,
        transportista,
        cajasRechazadas: refusal.cajasRechazadas,
        cajasGestionadas: refusal.cajasGestionadas,
        cajasRefusalFinal: refusal.cajasPendientes,
        refusal: refusal.refusal,
      };
    });
    const refusalByComRows = buildRefusalByComRows(modulaciones, records);
    const totals = records.reduce(
      (acc, record) => ({
        cajas: acc.cajas + Number(record.cajas || 0),
        rechazadas: acc.rechazadas + Number(record.cajasRechazadas || 0),
        gestionadas: acc.gestionadas + Number(record.cajasGestionadas || 0),
        refusalFinal: acc.refusalFinal + Number(record.cajasRefusalFinal || 0),
      }),
      { cajas: 0, rechazadas: 0, gestionadas: 0, refusalFinal: 0 },
    );
    const totalRefusal = totals.cajas ? Number(((totals.refusalFinal / totals.cajas) * 100).toFixed(2)) : 0;
    const summaries = CONTRACTORS.map((contractor) => {
      const contractorRecords = records.filter((record) => record.transportista === contractor);
      const cajas = contractorRecords.reduce((total, record) => total + Number(record.cajas || 0), 0);
      const refusalFinal = contractorRecords.reduce((total, record) => total + Number(record.cajasRefusalFinal || 0), 0);

      return {
        contractor,
        rutas: contractorRecords.length,
        cajas,
        clientes: contractorRecords.reduce((total, record) => total + Number(record.clientes || 0), 0),
        visitados: contractorRecords.reduce((total, record) => total + Number(record.visitados || 0), 0),
        rechazadas: contractorRecords.reduce((total, record) => total + Number(record.cajasRechazadas || 0), 0),
        gestionadas: contractorRecords.reduce((total, record) => total + Number(record.cajasGestionadas || 0), 0),
        refusalFinal,
        refusal: cajas ? Number(((refusalFinal / cajas) * 100).toFixed(2)) : 0,
      };
    });

    return {
      summaries,
      records,
      refusalByComRows,
      totalCajas: totals.cajas,
      totalRechazadas: totals.rechazadas,
      totalGestionadas: totals.gestionadas,
      totalRefusalFinal: totals.refusalFinal,
      totalRefusal,
    };
}
function getModulacionesByDt(records: ModulacionRegistro[], dt: string | number | undefined, contractor?: string, dateKey?: string) {
  const targetDt = normalizeDt(dt);
  const targetContractor = normalizeContractor(contractor);

  return records.filter((record) => {
    const sameDt = normalizeDt(record.dt) === targetDt;
    const sameContractor = !targetContractor || normalizeContractor(record.contratista) === targetContractor;
    const sameDate = !dateKey || getRecordDate(record) === dateKey;
    return sameDt && sameContractor && sameDate;
  });
}

function getCheckinByDt(records: AdminCheckin[], dt: string | number | undefined, contractor?: string) {
  const targetDt = normalizeDt(dt);
  const targetContractor = normalizeContractor(contractor);

  return records.find((record) => {
    const sameDt = normalizeDt(record.dt) === targetDt;
    const sameContractor = !targetContractor || normalizeContractor(record.contratista) === targetContractor;
    return sameDt && sameContractor;
  });
}

function summarizeRefusal(records: ModulacionRegistro[], totalCajasSalida = 0, cajasCheckin?: number) {
  const cajasRechazadas = records.reduce((total, record) => total + Number(record.totalCajas || 0), 0);
  const cajasGestionadas = records.reduce((total, record) => total + Number(record.cajasGestionadas || 0), 0);
  const pendientesModulacion = Math.max(cajasRechazadas - cajasGestionadas, 0);
  const tieneCheckin = typeof cajasCheckin === "number" && Number.isFinite(cajasCheckin);
  const cajasPendientes = tieneCheckin ? Math.max(cajasCheckin, 0) : pendientesModulacion;

  return {
    cajasRechazadas,
    cajasGestionadas,
    cajasPendientes,
    refusal: totalCajasSalida ? Number(((cajasPendientes / totalCajasSalida) * 100).toFixed(2)) : 0,
  };
}

function normalizeDt(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/^DT-?/i, "")
    .replace(/\D/g, "");
}

function normalizeContractor(value: string | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function contractorLabel(value: string | undefined) {
  const normalized = normalizeContractor(value);
  return CONTRACTORS.find((contractor) => normalizeContractor(contractor) === normalized);
}

function buildRefusalByComRows(modulaciones: ModulacionRegistro[], records: Vehiculo[]): AdminRefusalComRow[] {
  const vehicleByDtContractor = new Map(
    records.map((record) => [`${normalizeContractor(record.transportista)}:${normalizeDt(record.transporte)}:${getVehicleDate(record)}`, record]),
  );
  const fallbackVehicleByDtContractor = new Map(
    records.map((record) => [`${normalizeContractor(record.transportista)}:${normalizeDt(record.transporte)}`, record]),
  );

  return modulaciones.map((record) => {
    const contractor = contractorLabel(record.contratista) || record.contratista || "Sin contratista";
    const date = getRecordDate(record);
    const vehicle =
      vehicleByDtContractor.get(`${normalizeContractor(contractor)}:${normalizeDt(record.dt)}:${date}`) ||
      fallbackVehicleByDtContractor.get(`${normalizeContractor(contractor)}:${normalizeDt(record.dt)}`);
    const reportadas = Number(record.totalCajas || 0);
    const gestionadas = Number(record.cajasGestionadas || 0);

    return {
      causal: record.causal?.trim() || "Sin causal",
      contractor,
      codigoCliente: record.codigoCliente?.trim() || "Sin codigo",
      com: getCom(record, vehicle),
      date,
      dt: normalizeDt(record.dt),
      jefeVentas: getJefeVentas(record, vehicle),
      nombreCliente: record.nombreCliente?.trim() || "Cliente sin nombre",
      preventista: getPreventista(record),
      reportadas,
      gestionadas,
      refusalFinal: Math.max(reportadas - gestionadas, 0),
    };
  });
}

function getCom(record: ModulacionRegistro, vehicle: Vehiculo | undefined) {
  if (record.com?.trim()) return record.com.trim().toUpperCase();

  const candidates = [vehicle?.bloque, vehicle?.viaje, vehicle?.territorio].filter(Boolean) as string[];
  const found = candidates.find((value) => /^COM/i.test(value.trim()));
  if (found) return found.trim().toUpperCase();

  const code = String(record.codigoCliente || record.dt || "").replace(/\D/g, "");
  return code ? `COM${code.slice(-3).padStart(3, "0")}` : "Sin asignacion";
}

function getPreventista(record: ModulacionRegistro) {
  return record.preventistaNombre?.trim() || record.preventista?.trim() || "Sin preventista";
}

function getJefeVentas(record: ModulacionRegistro, vehicle: Vehiculo | undefined) {
  if (record.jefeComercial?.trim()) return record.jefeComercial.trim();

  return vehicle?.territorio && vehicle.territorio !== "Pendiente" ? vehicle.territorio : vehicle?.responsable || "Sin asignacion";
}

function getRecordDate(record: ModulacionRegistro) {
  return toDateKey(record.fechaDespacho || record.fechaDt || record.createdAt);
}

function getVehicleDate(record: Vehiculo) {
  return toDateKey(record.fechaDespacho || record.fechaDt || record.date || record.createdAt);
}

function toDateKey(value: string | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  if (value.includes("/")) {
    const [day, month, year] = value.split("/").map(Number);
    if ([day, month, year].every(Number.isFinite)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function fromModulacionListRow(row: ModulacionListRow): ModulacionRegistro {
  return {
    id: readString(row.id),
    contratista: readString(row.contractor) || readString(row.contratista),
    dt: readString(row.dt),
    fechaDespacho: readString(row.fechaDespacho),
    fechaDt: readString(row.fechaDt),
    codigoCliente: readString(row.codigoCliente),
    nombreCliente: readString(row.nombreCliente),
    telefonoCliente: readString(row.telefonoCliente),
    com: readString(row.com),
    jefeComercial: readString(row.jefeComercial),
    telefonoJefeComercial: readString(row.telefonoJefeComercial),
    preventista: readString(row.preventista),
    preventistaNombre: readString(row.preventistaNombre),
    telefonoPreventista: readString(row.telefonoPreventista),
    totalCajas: readString(row.totalCajas),
    cajasGestionadas: readString(row.cajasGestionadas),
    persona: readString(row.persona),
    personaNombre: readString(row.personaNombre),
    causal: readString(row.causal),
    comentario: readString(row.comentario),
    comentarioModulador: readString(row.comentarioModulador),
    imagenNombre: readString(row.imagenNombre),
    imagenVista: "",
    createdAt: readString(row.createdAt),
  };
}

function readString(value: unknown) {
  return String(value ?? "").trim();
}
