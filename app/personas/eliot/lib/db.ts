import type { BackupPayload, CrewMember, CrewRole, PinRecord, TdRow, TdSnapshot, TdStatus } from "./types";

const SNAPSHOTS_KEY = "people.control.td.snapshots";
const PIN_KEY = "people.control.td.pin";

export async function listSnapshots(): Promise<TdSnapshot[]> {
  const snapshots = readSnapshots();
  const incomplete = snapshots.filter(isIncompleteSnapshot);
  for (const snapshot of incomplete) await deleteSnapshot(snapshot.id);
  return snapshots.filter((snapshot) => !isIncompleteSnapshot(snapshot));
}

export async function saveSnapshot(snapshot: TdSnapshot) {
  const snapshots = readSnapshots();
  const index = snapshots.findIndex((item) => item.id === snapshot.id);
  if (index >= 0) snapshots[index] = snapshot;
  else snapshots.unshift(snapshot);
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export async function deleteSnapshot(id: string) {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(readSnapshots().filter((snapshot) => snapshot.id !== id)));
}

export async function findSnapshotByHash(hash: string) {
  const snapshots = await listSnapshots();
  const existing = snapshots.find((snapshot) => snapshot.fileHash === hash);
  if (existing && isIncompleteSnapshot(existing)) {
    await deleteSnapshot(existing.id);
    return null;
  }
  return existing ?? null;
}

function isIncompleteSnapshot(snapshot: TdSnapshot) {
  if (!snapshot.rows.length) return true;
  return !snapshot.rows.some((row) => Object.values(row.crew).some((member) => member.validPerson));
}

export async function getPinRecord(): Promise<PinRecord | null> {
  return readJson<PinRecord | null>(PIN_KEY, null);
}

export async function savePinRecord(record: PinRecord) {
  localStorage.setItem(PIN_KEY, JSON.stringify(record));
}

export async function clearApplicationData() {
  localStorage.removeItem(SNAPSHOTS_KEY);
  localStorage.removeItem(PIN_KEY);
}

export async function createBackup(): Promise<BackupPayload> {
  return { version: 1, exportedAt: new Date().toISOString(), snapshots: await listSnapshots() };
}

export async function restoreBackup(payload: BackupPayload) {
  if (payload?.version !== 1 || !Array.isArray(payload.snapshots)) throw new Error("El respaldo no tiene un formato compatible.");
  for (const snapshot of payload.snapshots) await saveSnapshot(snapshot);
}

function readSnapshots() {
  const stored = readJson<TdSnapshot[]>(SNAPSHOTS_KEY, []);
  if (stored.length) return stored;
  const seeded = buildInitialSnapshots();
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(seeded));
  return seeded;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function buildInitialSnapshots(): TdSnapshot[] {
  const now = new Date();
  const operationalDate = localDate(now);
  const names = [
    ["Carlos Mendoza", "Andrés Pérez", "Miguel Torres"],
    ["Luis Herrera", "Daniel Rojas", "Jorge Castillo"],
    ["Ricardo Gómez", "Felipe Díaz", "Óscar Martínez"],
    ["Samuel Castro", "Kevin León", "Iván Ramírez"],
  ];
  const snapshots = [0, 1, 2].map((cut) => {
    const uploaded = new Date(now.getTime() - (2 - cut) * 55 * 60 * 1000);
    const rows: TdRow[] = Array.from({ length: 8 }, (_, index) => {
      const people = names[index % names.length];
      const base = 210 + index * 35 + cut * 18;
      const member = (role: CrewRole, name: string, offset: number): CrewMember => {
        const tdSeconds = base + offset;
        const status: TdStatus = tdSeconds <= 300 ? "bien" : tdSeconds <= 600 ? "regular" : "mal";
        return { role, name, document: `10010${index}${offset}`, arrivalSeconds: 21600 + index * 120, tdSeconds, status, validPerson: true };
      };
      return {
        id: `ruta-${cut}-${index}`,
        dt: String(1760 + index),
        trip: "Viaje 1",
        plate: `KLM-${101 + index}`,
        responsible: people[0],
        dispatchDate: operationalDate,
        dtDate: operationalDate,
        routeStatus: index < 5 ? "EN RUTA" : "FINALIZADA",
        clients: 26 + index,
        visited: 10 + index * 2,
        boxes: 480 + index * 25,
        hectoliters: 105 + index * 4,
        departureSeconds: 23400 + index * 180,
        lateDepartureCause: "",
        lateDepartureComment: "",
        routeArrival: "",
        routeTime: "",
        plannedTime: "08:00",
        territory: index % 2 ? "Galapa" : "Barranquilla",
        carrier: "Logísticos",
        crew: {
          rr: member("rr", people[0], 0),
          aux: member("aux", people[1], 45),
          conductor: member("conductor", people[2], 85),
        },
      };
    });
    return {
      id: `corte-${operationalDate}-${cut + 1}`,
      fileName: `Control_DT_${operationalDate}_${cut + 1}.xlsx`,
      fileHash: `local-${operationalDate}-${cut + 1}`,
      operationalDate,
      uploadedAt: uploaded.toISOString(),
      rows,
      warnings: [],
    };
  });
  return snapshots.reverse();
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
