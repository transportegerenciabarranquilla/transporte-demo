import { tables, type TableConfig } from './config.ts';

export class PortalError extends Error {
  status: number;
  constructor(message: string, status = 500) { super(message); this.status = status; }
}
type JsonRecord = Record<string, unknown>;
type StoredRecord = { guid: string; key: string; etag?: string; data: JsonRecord };

function table(endpoint: string): TableConfig {
  const config = tables[endpoint];
  if (!config) throw new PortalError(`Falta configurar la tabla Dataverse para ${endpoint}.`, 503);
  for (const column of [config.entitySet, config.id, config.key, config.name, config.payload]) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(column)) throw new PortalError('Nombre lógico inválido en la configuración.', 503);
  }
  return config;
}

async function token() {
  const response = await fetch('/_layout/tokenhtml', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new PortalError('No se pudo obtener el token de Power Pages.', response.status);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const value = doc.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]')?.value;
  if (!value) throw new PortalError('Power Pages no entregó el token CSRF.', 401);
  return value;
}

export async function requestDataverse(path: string, options: RequestInit = {}) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/_api/')) throw new PortalError('URL de Dataverse inválida.');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('OData-Version', '4.0');
  headers.set('OData-MaxVersion', '4.0');
  headers.set('__RequestVerificationToken', await token());
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new PortalError(body?.error?.message || `Dataverse respondió ${response.status}.`, response.status);
  }
  return response;
}

function guid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)) throw new PortalError('Dataverse devolvió un identificador inválido.');
  return value;
}

export async function readStoredRecords(endpoint: string): Promise<StoredRecord[]> {
  const config = table(endpoint);
  let next: string | undefined = `/_api/${config.entitySet}?$select=${[config.id, config.key, config.payload].join(',')}`;
  const records: StoredRecord[] = [];
  const visited = new Set<string>();
  while (next) {
    if (visited.has(next)) throw new PortalError('Paginación repetida de Dataverse.');
    visited.add(next);
    const response = await requestDataverse(next);
    const body = await response.json();
    if (!Array.isArray(body.value)) throw new PortalError('Respuesta de Dataverse inválida.');
    for (const row of body.value) {
      let data: unknown;
      try { data = JSON.parse(row[config.payload]); } catch { throw new PortalError('Hay un registro JSON dañado en Dataverse.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new PortalError('Registro Dataverse inválido.');
      records.push({ guid: guid(row[config.id]), key: String(row[config.key]), etag: row['@odata.etag'], data: data as JsonRecord });
    }
    next = body['@odata.nextLink'];
  }
  return records;
}

export async function readRecords(endpoint: string) { return (await readStoredRecords(endpoint)).map(row => row.data); }

export function recordKey(endpoint: string, record: JsonRecord) {
  const contractor = String(record.contratista || record.transportista || '').trim();
  const identity = record.id || record.recordId || (endpoint === '/api/people/profiles' ? record.cc : '')
    || [record.transporte || record.dt || record.vehiculo, record.fechaDespacho || record.createdAt].filter(Boolean).join('|');
  if (!identity) throw new PortalError('El registro no tiene una clave estable.', 400);
  return `${contractor}|${identity}`;
}

export async function upsertRecords(endpoint: string, records: JsonRecord[]) {
  const config = table(endpoint);
  const existing = new Map((await readStoredRecords(endpoint)).map(row => [row.key, row]));
  // Prevalidar todo el lote antes de escribir. No eliminar filas omitidas.
  const prepared = records.map(record => {
    const key = recordKey(endpoint, record);
    const payload = JSON.stringify(record);
    if (payload.length > config.maxPayloadLength) throw new PortalError('El registro supera el tamaño de la columna Dataverse.', 413);
    return { key, payload };
  });
  if (new Set(prepared.map(row => row.key)).size !== prepared.length) throw new PortalError('El lote contiene claves duplicadas.', 400);
  for (const record of prepared) {
    const old = existing.get(record.key);
    const values = { [config.key]: record.key, [config.name]: record.key, [config.payload]: record.payload };
    await requestDataverse(`/_api/${config.entitySet}${old ? `(${old.guid})` : ''}`, {
      method: old ? 'PATCH' : 'POST',
      headers: old ? { 'If-Match': old.etag || '*' } : undefined,
      body: JSON.stringify(values),
    });
  }
  return readRecords(endpoint);
}

export async function deleteRecords(endpoint: string, ids: string[]) {
  const config = table(endpoint);
  const idSet = new Set(ids);
  const rows = await readStoredRecords(endpoint);
  for (const row of rows) {
    if (!idSet.has(String(row.data.id || row.data.recordId || ''))) continue;
    await requestDataverse(`/_api/${config.entitySet}(${row.guid})`, { method: 'DELETE', headers: { 'If-Match': row.etag || '*' } });
  }
}
