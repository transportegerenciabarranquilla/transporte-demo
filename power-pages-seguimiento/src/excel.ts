import * as XLSX from "xlsx";
import type { Vehicle } from "./types";

function value(row: Record<string, unknown>, ...names: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, item]) => [normalize(key), item]));
  for (const name of names) {
    const found = normalized.get(normalize(name));
    if (found !== undefined && found !== null && found !== "") return found;
  }
  return "";
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function number(input: unknown) {
  const parsed = Number(String(input ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function date(input: unknown) {
  if (input instanceof Date) return input.toISOString().slice(0, 10);
  if (typeof input === "number") return XLSX.SSF.parse_date_code(input)
    ? new Date(Date.UTC(XLSX.SSF.parse_date_code(input).y, XLSX.SSF.parse_date_code(input).m - 1, XLSX.SSF.parse_date_code(input).d)).toISOString().slice(0, 10)
    : "";
  const raw = String(input || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
}

export async function parseWorkbook(file: File): Promise<Vehicle[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const routes = rows.flatMap((row) => {
    const dt = String(value(row, "DT", "Transporte", "Numero transporte")).trim();
    const plate = String(value(row, "Vehiculo", "Placa")).trim();
    const dispatchDate = date(value(row, "Fecha despacho", "FechaDespacho", "Fecha DT", "Fecha"));
    if (!dt && !plate) return [];
    return [{
      key: `${(dt || plate).toLowerCase().replace(/[^a-z0-9]/g, "")}-${dispatchDate || "sin-fecha"}`,
      dt,
      plate,
      responsible: String(value(row, "Responsable", "Nombre RR", "Conductor")).trim(),
      territory: String(value(row, "Territorio", "Zona")).trim(),
      dispatchDate,
      boxes: number(value(row, "Cajas", "Cajas total")),
      hl: number(value(row, "HL", "Hectolitros")),
      customers: number(value(row, "Clientes", "Clientes total")),
      visited: number(value(row, "Visitados", "Clientes visitados")),
      departureTime: String(value(row, "Hora salida")).trim() || "Pendiente",
      arrivalTime: String(value(row, "Hora llegada")).trim() || "Pendiente",
      plannedTime: String(value(row, "Tiempo planeado")).trim(),
      status: String(value(row, "Estado")).trim() || "Cargando",
    } satisfies Vehicle];
  });
  return [...new Map(routes.map((route) => [route.key, route])).values()];
}
