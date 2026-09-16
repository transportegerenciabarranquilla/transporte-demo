import { DATAVERSE } from "./config";
import type { Vehicle } from "./types";

type PortalWindow = Window & {
  Microsoft?: { Dynamic365?: { Portal?: { User?: { userName?: string; firstName?: string; lastName?: string } } } };
};

export function getPortalUser() {
  const user = (window as PortalWindow).Microsoft?.Dynamic365?.Portal?.User;
  return {
    authenticated: Boolean(user?.userName),
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || (user?.userName && !/^[0-9a-f-]{36}$/i.test(user.userName) ? user.userName : "Usuario autenticado"),
  };
}

async function verificationToken() {
  const response = await fetch("/_layout/tokenhtml", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Power Pages no entregó el token de seguridad.");
  const html = await response.text();
  const match = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/i)
    || html.match(/value="([^"]+)"[^>]*name="__RequestVerificationToken"/i);
  if (!match?.[1]) throw new Error("No se encontró el token de seguridad de Power Pages.");
  return match[1];
}

async function portalFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
    headers.set("__RequestVerificationToken", await verificationToken());
    headers.set("Prefer", "return=representation");
  }
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || body?.error || `Error de Dataverse (${response.status}).`);
  }
  return response;
}

export async function listVehicles(): Promise<Vehicle[]> {
  const fields = [DATAVERSE.id, DATAVERSE.payload].join(",");
  const response = await portalFetch(`/_api/${DATAVERSE.entitySet}?$select=${fields}`);
  const body = await response.json();
  const records = (Array.isArray(body.value) ? body.value : []).flatMap((row: Record<string, unknown>) => {
    try {
      const vehicle = JSON.parse(String(row[DATAVERSE.payload] || "")) as Vehicle;
      const odataId = String(row["@odata.id"] || row["odata.id"] || "");
      const idFromUrl = odataId.match(/\(([^)]+)\)/)?.[1] || "";
      return [{ ...vehicle, id: String(row[DATAVERSE.id] || idFromUrl || "") || undefined }];
    } catch {
      return [];
    }
  });
  return [...new Map((records as Vehicle[]).map((vehicle) => [vehicle.key, vehicle])).values()];
}

export async function createVehicle(vehicle: Vehicle): Promise<Vehicle> {
  const response = await portalFetch(`/_api/${DATAVERSE.entitySet}`, {
    method: "POST",
    body: JSON.stringify({
      [DATAVERSE.name]: vehicle.dt || vehicle.plate,
      [DATAVERSE.payload]: JSON.stringify(vehicle),
    }),
  });
  const entityId = response.headers.get("entityid") || response.headers.get("OData-EntityId") || "";
  const body = await response.json().catch(() => ({}));
  const idFromBody = String(body?.[DATAVERSE.id] || "");
  return { ...vehicle, id: idFromBody || entityId.match(/\(([^)]+)\)/)?.[1] || undefined };
}

export async function updateVehicle(vehicle: Vehicle): Promise<void> {
  if (!vehicle.id) throw new Error("El registro todavía no tiene identificador de Dataverse.");
  await portalFetch(`/_api/${DATAVERSE.entitySet}(${vehicle.id})`, {
    method: "PATCH",
    body: JSON.stringify({
      [DATAVERSE.name]: vehicle.dt || vehicle.plate,
      [DATAVERSE.payload]: JSON.stringify(vehicle),
    }),
  });
}

export async function saveImportedVehicles(current: Vehicle[], imported: Vehicle[]) {
  const currentByKey = new Map(current.map((vehicle) => [vehicle.key, vehicle]));
  const saved: Vehicle[] = [];
  for (const incoming of new Map(imported.map((vehicle) => [vehicle.key, vehicle])).values()) {
    const existing = currentByKey.get(incoming.key);
    if (existing?.id) {
      const merged = { ...existing, ...incoming, id: existing.id,
        visited: Math.min(existing.visited, incoming.customers),
        departureTime: existing.departureTime,
        arrivalTime: existing.arrivalTime,
        status: existing.status,
      };
      await updateVehicle(merged);
      saved.push(merged);
    } else {
      saved.push(await createVehicle(incoming));
    }
  }
  return [...current.filter((vehicle) => !imported.some((item) => item.key === vehicle.key)), ...saved];
}
