const names = [
  "Carlos Mendoza",
  "Andrés Pérez",
  "Miguel Torres",
  "Luis Herrera",
  "Jorge Díaz",
  "Daniel Ruiz",
  "Óscar Romero",
  "Felipe Castro",
];

const contractors = ["Logisticos", "Surti Cervezas", "Punto Corona"];

export function demoDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function demoVehicles() {
  const date = demoDate();
  return contractors.slice(0, 1).flatMap((contractor, contractorIndex) =>
    names.map((responsable, index) => {
      const routeIndex = contractorIndex * 10 + index;
      const dt = String(1760 + routeIndex);
      return {
        recordId: `demo-${contractorIndex}-${index}`,
        cajasGestionadas: index % 3,
        cajasReportadas: 520 + index * 20,
        createdAt: `${date}T${String(6 + index).padStart(2, "0")}:15:00-05:00`,
        date,
        mes: "julio",
        cd: contractorIndex === 0 ? "AV76" : contractorIndex === 1 ? "SURTI" : "CORONA",
        transportista: contractor,
        llave: `DEMO-${contractorIndex}-${index}`,
        transporte: dt,
        centro: contractorIndex === 2 ? "CD La Arenosa" : "CD Galapa",
        codTransportista: `DEMO-${contractorIndex + 1}`,
        fechaDt: date,
        fechaDespacho: date,
        vehiculo: `KLM-${101 + routeIndex}`,
        responsable,
        territorio: index % 2 ? "Barranquilla Norte" : "Barranquilla Sur",
        viaje: "Viaje 1",
        bloque: index < 4 ? "1" : "2",
        cajas: 520 + index * 20,
        hl: 118 + index * 5,
        clientes: 30 + index,
        visitados: 10 + index * 2,
        horaSalida: index < 6 ? `06:${String(20 + index * 5).padStart(2, "0")}` : "",
        peso: 10500 + index * 200,
        capacidad: 16000,
        validadorPeso: "OK",
        avanceRuta: `${Math.min(95, 40 + index * 7)}%`,
        status: index < 6 ? "EN RUTA" : "PENDIENTE POR SALIR",
        horaLlegada: "",
        tiempoRuta: "",
        tiempoPlaneado: "08:00",
        metaRelevo: "10:30",
        horaInicioRelevo: "",
        clasificacionRelevo: "",
        alertaSifPotencial: index === 6 ? "ALERTA" : "",
        relevador: "",
        causalDesviado: "",
        clasificacionOnTime: index < 5 ? "A TIEMPO" : "FUERA DE META",
        recargue: "NO",
        cedulaResponsable: `100000${index}`,
        nombreResponsable: responsable,
        cedulaAuxiliar1: `200000${index}`,
        nombreAuxiliar1: `Auxiliar ${index + 1}`,
        cedulaAuxiliar2: `300000${index}`,
        nombreAuxiliar2: `Conductor ${index + 1}`,
        cajasRechazadas: index % 4,
        cajasRefusalFinal: index % 3,
        clientesRechazan: index % 2,
        refusal: Number((((index % 3) / (520 + index * 20)) * 100).toFixed(2)),
      };
    }),
  );
}

export function demoModulations() {
  const date = demoDate();
  return demoVehicles().slice(0, 6).map((vehicle, index) => ({
    id: `mod-demo-${index}`,
    contratista: vehicle.transportista,
    dt: vehicle.transporte,
    fechaDespacho: date,
    fechaDt: date,
    codigoCliente: String(9000100 + index),
    nombreCliente: `Cliente demo ${index + 1}`,
    telefonoCliente: `30055501${String(index).padStart(2, "0")}`,
    com: `COM5D${(index % 4) + 1}`,
    jefeComercial: "Laura Gómez",
    telefonoJefeComercial: "3005552000",
    preventista: `RR-${21 + index}`,
    preventistaNombre: "Camilo Díaz",
    telefonoPreventista: "3005553000",
    totalCajas: String(3 + index),
    cajasGestionadas: String(index % 3),
    persona: "1000000",
    personaNombre: "Carlos Mendoza",
    causal: ["Cliente sin dinero", "Local cerrado", "Pedido duplicado"][index % 3],
    comentario: "Caso demo para seguimiento.",
    comentarioModulador: "Gestión en curso.",
    imagenNombre: "",
    imagenVista: "",
    createdAt: `${date}T08:${String(20 + index).padStart(2, "0")}:00-05:00`,
  }));
}

export function demoAttendances() {
  const date = demoDate();
  return demoVehicles().slice(0, 10).map((vehicle, index) => ({
    id: `asis-demo-${index}`,
    contratista: vehicle.transportista,
    dt: vehicle.transporte,
    cedulaResponsable: vehicle.cedulaResponsable,
    cedulaAuxiliar1: vehicle.cedulaAuxiliar1,
    cedulaAuxiliar2: vehicle.cedulaAuxiliar2,
    nombreResponsable: vehicle.nombreResponsable,
    nombreAuxiliar1: vehicle.nombreAuxiliar1,
    nombreAuxiliar2: vehicle.nombreAuxiliar2,
    llave: `${vehicle.transportista}-${vehicle.transporte}-${date}`,
    createdAt: `${date}T05:${String(20 + index).padStart(2, "0")}:00-05:00`,
  }));
}

export function demoCheckins() {
  const now = new Date().toISOString();
  return demoVehicles().slice(0, 6).map((vehicle, index) => ({
    id: `checkin-demo-${index}`,
    dt: vehicle.transporte,
    totalCajas: index % 3,
    createdAt: now,
    updatedAt: now,
  }));
}

export function demoPeopleGroups() {
  return contractors.map((contractor, contractorIndex) => {
    const people = names.slice(0, contractorIndex === 0 ? 8 : 5).map((nombre, index) => ({
      cc: `${contractorIndex + 1}00000${index}`,
      nombre,
      cargo: index % 3 === 0 ? "Conductor" : index % 3 === 1 ? "Auxiliar" : "Responsable de reparto",
      contratista: contractor,
      stats: {
        rutas: 8 + index,
        modulaciones: index % 4,
        reubicaciones: index % 2,
        gestionadas: index % 3,
        hectolitros: 110 + index * 6,
        visitasRango: 25 + index,
        enRango: 20 + index,
        fueraRango: 3,
        porcentajeRango: 82 + index,
        tiempoPromedioRuta: `${7 + (index % 3)} h ${10 + index} m`,
        ultimoDt: String(1760 + contractorIndex * 10 + index),
      },
      history: [
        { type: "ruta", date: demoDate(), title: "Ruta completada", detail: `DT ${1760 + contractorIndex * 10 + index}` },
        { type: "asistencia", date: demoDate(), title: "Ingreso registrado", detail: `05:${String(30 + index).padStart(2, "0")}` },
      ],
    }));
    return { name: contractor, total: people.length, people };
  });
}

export function demoClockRows() {
  return demoPeopleGroups().flatMap((group, groupIndex) =>
    group.people.map((person, index) => ({
      identificador: person.cc,
      nombreCompleto: person.nombre,
      cargo: person.cargo,
      contratista: group.name,
      fechaKey: demoDate(),
      entrada: `0${5 + (index % 2)}:${String(20 + index * 4).padStart(2, "0")}`,
      salida: index % 4 === 0 ? "15:30" : "",
      grupo: `Grupo ${groupIndex + 1}`,
      turno: "Turno mañana",
    })),
  );
}

export function demoRangeReports() {
  const date = demoDate();
  return contractors.slice(0, 1).map((contractor, index) => ({
    id: `rango-demo-${index}`,
    contractor,
    operationalDate: date,
    kind: "current",
    fileName: `rango-${contractor.toLowerCase().replace(/\s/g, "-")}.xlsx`,
    uploadedAt: `${date}T07:15:00-05:00`,
    updatedAt: `${date}T07:15:00-05:00`,
    summary: {
      seguimientoDts: 4,
      csvDts: 4,
      matchedDts: 4,
      totalRows: 16,
      ignoredNotStarted: 1,
      startedRows: 15,
      inRange: 12 - index,
      outOfRange: 3 + index,
      concluded: 11,
      returned: 2,
      openRows: 2,
      modulatedRows: 2,
      modulationOpenRows: 1,
      modulationPercent: 67,
      deliveryRangePercent: 80 - index * 5,
      crews: [],
    },
  }));
}

export function demoAuditLogs() {
  const actions = ["seguimiento_guardado", "modulacion_guardada", "asistencia_guardada", "punto_corona_archivo_subido"];
  return Array.from({ length: 12 }, (_, index) => ({
    id: `audit-demo-${index}`,
    action: actions[index % actions.length],
    module: ["Seguimiento", "Modulación", "Asistencia", "Rango"][index % 4],
    contractor: contractors[index % contractors.length],
    userEmail: index % 3 === 0 ? "admin@gmail.com" : "logisticos@gmail.com",
    ipAddress: "192.168.1.64",
    userAgent: "Demo Browser",
    device: index % 2 ? "Escritorio" : "Móvil",
    recordId: `demo-${index}`,
    details: { registros: index + 1, modo: "demo" },
    createdAt: new Date(Date.now() - index * 3_600_000).toISOString(),
  }));
}
