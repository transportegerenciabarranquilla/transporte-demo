import { NextResponse, type NextRequest } from "next/server";
import {
  demoAttendances,
  demoAuditLogs,
  demoCheckins,
  demoClockRows,
  demoPeopleGroups,
  demoRangeReports,
  demoVehicles,
} from "./app/lib/demoData";

const PASSTHROUGH = [
  "/api/session/",
  "/api/clientes",
  "/api/capacidad-carga",
  "/api/personas",
  "/api/people/nps",
  "/api/people/coordinates",
  "/api/seguimiento",
  "/api/asistencias/buscar",
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/") || PASSTHROUGH.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  const peopleGroups = demoPeopleGroups();
  const vehicles = demoVehicles();

  if (path === "/api/people/rti") {
    const records = buildDemoRtiRows();
    return NextResponse.json({
      records,
      total: records.length,
      duplicateRowsRemoved: { RACOCIMI1: 0, RACOCIMI2: 0 },
      mode: "demo",
    });
  }

  if (path === "/api/people/summary") {
    return NextResponse.json({ contractors: peopleGroups });
  }

  if (path === "/api/people/profiles") {
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return NextResponse.json({ profiles: Array.isArray(body.profiles) ? body.profiles : [] });
    }
    return NextResponse.json({
      profiles: peopleGroups.flatMap((group) =>
        group.people.map((person) => ({
          cc: person.cc,
          nombre: person.nombre,
          cargo: person.cargo,
          contratista: person.contratista,
          isLocal: false,
        })),
      ),
    });
  }

  if (path === "/api/people/gerencia") {
    const attendances = demoAttendances();
    return NextResponse.json({
      contractors: peopleGroups,
      seguimiento: vehicles.map((vehicle) => ({ ...vehicle, contractor: vehicle.transportista })),
      asistencias: attendances,
      sourceCounts: { seguimiento: vehicles.length, asistencias: attendances.length },
    });
  }

  if (path === "/api/people/attendance-snapshots") {
    const snapshot = {
      operationalDate: today(),
      fileName: "asistencia-demo.xlsx",
      uploadedAt: new Date().toISOString(),
      closedAt: null,
      rows: demoClockRows(),
    };
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return NextResponse.json({ snapshot: { ...snapshot, ...body } });
    }
    if (request.method === "PATCH") {
      return NextResponse.json({ snapshot: { ...snapshot, closedAt: new Date().toISOString() } });
    }
    return NextResponse.json({ snapshots: [snapshot] });
  }

  if (path === "/api/admin/seguimiento") {
    return NextResponse.json({
      records: vehicles,
      summaries: buildAdminSummaries(vehicles),
      refusalByComRows: vehicles.slice(0, 8).map((vehicle, index) => ({
        causal: ["Cliente sin dinero", "Local cerrado", "Pedido duplicado"][index % 3],
        contractor: vehicle.transportista,
        codigoCliente: String(9000100 + index),
        com: `COM5D${(index % 4) + 1}`,
        date: today(),
        dt: vehicle.transporte,
        jefeVentas: "Laura Gómez",
        nombreCliente: `Cliente demo ${index + 1}`,
        preventista: `RR-${21 + index}`,
        reportadas: Number(vehicle.cajasRechazadas || 0),
        gestionadas: Number(vehicle.cajasGestionadas || 0),
        refusalFinal: Number(vehicle.cajasRefusalFinal || 0),
      })),
    });
  }

  if (path === "/api/admin/rango") {
    return NextResponse.json({ reports: demoRangeReports() });
  }

  if (path === "/api/admin/audit-logs") {
    return NextResponse.json({ records: demoAuditLogs() });
  }

  if (path === "/api/asistencias") {
    return NextResponse.json({ records: demoAttendances() });
  }

  if (path === "/api/checkins") {
    return NextResponse.json({ records: demoCheckins() });
  }

  return NextResponse.json({ records: [], message: "Operación procesada en modo demo." });
}

function buildAdminSummaries(vehicles: ReturnType<typeof demoVehicles>) {
  return Array.from(new Set(vehicles.map((vehicle) => vehicle.transportista))).map((contractor) => {
    const records = vehicles.filter((vehicle) => vehicle.transportista === contractor);
    const cajas = records.reduce((total, vehicle) => total + Number(vehicle.cajas || 0), 0);
    const refusalFinal = records.reduce((total, vehicle) => total + Number(vehicle.cajasRefusalFinal || 0), 0);
    return {
      contractor,
      rutas: records.length,
      cajas,
      clientes: records.reduce((total, vehicle) => total + Number(vehicle.clientes || 0), 0),
      visitados: records.reduce((total, vehicle) => total + Number(vehicle.visitados || 0), 0),
      rechazadas: records.reduce((total, vehicle) => total + Number(vehicle.cajasRechazadas || 0), 0),
      gestionadas: records.reduce((total, vehicle) => total + Number(vehicle.cajasGestionadas || 0), 0),
      refusalFinal,
      refusal: cajas ? Number(((refusalFinal / cajas) * 100).toFixed(2)) : 0,
    };
  });
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildDemoRtiRows() {
  const references = [
    { material: "3500213", description: "ENVASE FLINT 330R" },
    { material: "3500214", description: "ENVASE AMBAR 330R" },
    { material: "3500250", description: "CANASTA PLASTICA 30 UND" },
    { material: "3500301", description: "ENVASE LITRO RETORNABLE" },
  ];
  const carriers = ["Logisticos", "Punto Corona", "Surti Cervezas"];
  const responsibles = ["Carlos Mendoza", "Andres Perez", "Miguel Torres", "Luis Herrera", "Jorge Diaz", "Daniel Ruiz"];
  const now = new Date();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - (index % 14)));
    const reference = references[index % references.length];
    const outbound = 600 + (index % 7) * 90;
    const performance = [1, 0.98, 0.94, 0.89, 0.83, 0.76][index % 6];
    const returned = Math.round(outbound * performance);
    return {
      Dia: date.getDate(),
      Mes: date.toLocaleDateString("es-CO", { month: "long" }),
      Ano: date.getFullYear(),
      "Nombre RR": responsibles[index % responsibles.length],
      "Descripcion de envase": reference.description,
      Material: reference.material,
      Transportista: carriers[index % carriers.length],
      "Porcentaje RTI": Math.round((returned / outbound) * 1_000) / 10,
      "Cajas reales salida": outbound,
      "Cajas reales retorno": returned,
      DT: String(1760 + (index % 12)),
      "Fecha de despacho": `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    };
  });
}

export const config = { matcher: "/api/:path*" };
