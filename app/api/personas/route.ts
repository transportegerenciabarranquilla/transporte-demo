import { NextResponse } from "next/server";
import { normalizeContractorName } from "../../lib/contractors";

type Persona = {
  CC: string;
  NOMBRE: string;
  CARGO: string;
  CONTRATISTA: string;
};

const dummyNames = [
  "Carlos Mendoza",
  "Andrés Pérez",
  "Miguel Torres",
  "Luis Herrera",
  "Jorge Díaz",
  "Daniel Ruiz",
  "Óscar Romero",
  "Felipe Castro",
];

const rows: Persona[] = [
  ...dummyNames.map((NOMBRE, index) => ({
    CC: `100000${index}`,
    NOMBRE,
    CARGO: index < 2 ? "Conductor" : "Auxiliar",
    CONTRATISTA: "Logísticos",
  })),
  { CC: "10000101", NOMBRE: "Carlos Mendoza", CARGO: "Conductor", CONTRATISTA: "Logísticos" },
  { CC: "10000102", NOMBRE: "Andrés Pérez", CARGO: "Conductor", CONTRATISTA: "Logísticos" },
  { CC: "10000103", NOMBRE: "Miguel Torres", CARGO: "Auxiliar", CONTRATISTA: "Logísticos" },
  { CC: "10000104", NOMBRE: "Diana Ruiz", CARGO: "Relevador", CONTRATISTA: "Logísticos" },
];

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cc = searchParams.get("cc")?.replace(/\D/g, "") || "";
  const contractor = normalizeContractorName(searchParams.get("contratista"));
  const query = normalizeSearch(searchParams.get("q") || "");

  const filteredRows = rows.filter((persona) => {
    if (contractor && normalizeContractorName(persona.CONTRATISTA) !== contractor) return false;
    if (cc && persona.CC !== cc) return false;
    if (query && !normalizeSearch(`${persona.NOMBRE} ${persona.CC} ${persona.CARGO}`).includes(query)) return false;
    return true;
  });

  return NextResponse.json({
    persona: cc ? filteredRows[0] || null : undefined,
    personas: filteredRows,
    records: filteredRows,
  });
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
