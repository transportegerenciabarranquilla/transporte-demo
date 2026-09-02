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

export const config = { matcher: "/api/:path*" };
