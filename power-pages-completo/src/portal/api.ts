import { getPortalSession, signOut } from './session';
import { deleteRecords, PortalError, readRecords, upsertRecords } from './dataverse';
import { getAdminReport } from './adminReport';
import { getPeopleReport } from './peopleReport';

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
const normal = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const dt = (value: unknown) => String(value || '').replace(/^DT-?/i, '').replace(/\D/g, '');

function emptyGet(endpoint: string) {
  if (endpoint === '/api/admin/seguimiento') return json({ summaries: [], records: [], refusalByComRows: [], totalCajas: 0, totalRechazadas: 0, totalGestionadas: 0, totalRefusalFinal: 0, totalRefusal: 0 });
  if (endpoint === '/api/people/summary') return json({ contractors: [], generatedAt: new Date().toISOString() });
  if (endpoint === '/api/people/profiles') return json({ profiles: [] });
  if (endpoint === '/api/personas') return json({ personas: [], persona: null });
  if (endpoint === '/api/clientes') return json({ cliente: null });
  if (endpoint === '/api/capacidad-carga') return json({ capacidad: null });
  return json({ records: [] });
}

export async function portalFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, window.location.origin);
  // No se interceptan plantillas ni solicitudes ajenas a la antigua API de Next.js.
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return fetch(input, init);
  const endpoint = url.pathname;
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  try {
    const session = getPortalSession();
    if (endpoint === '/api/session/session' || endpoint === '/api/auth/session') return json({ session }, session ? 200 : 401);
    if (endpoint.endsWith('/logout')) { signOut(); return json({ ok: true }); }
    if (endpoint.endsWith('/login')) throw new PortalError('Inicia sesión mediante Microsoft en Power Pages.', 401);
    if (!session) throw new PortalError('Debes iniciar sesión en Power Pages.', 401);
    if (endpoint.startsWith('/api/admin/') && !session.isAdmin) throw new PortalError('No autorizado.', 403);
    if (endpoint.startsWith('/api/people/') && !session.isAdmin && !session.isPeople) throw new PortalError('No tienes permiso para Personas.', 403);
    if (endpoint === '/api/admin/seguimiento' && method === 'GET') return json(await getAdminReport());
    if (endpoint === '/api/people/summary' && method === 'GET') return json(await getPeopleReport());
    const tableEndpoint = endpoint === '/api/asistencias/buscar' ? '/api/asistencias' : endpoint;
    if (method === 'GET') {
      let records = await readRecords(tableEndpoint);
      const contractor = url.searchParams.get('contratista') || (!session.isAdmin && !session.isPeople ? session.contractor : '');
      if (contractor) records = records.filter(row => normal(row.contratista || row.transportista || row.CONTRATISTA) === normal(contractor));
      const requestedDt = url.searchParams.get('dt');
      if (requestedDt) records = records.filter(row => dt(row.dt || row.transporte) === dt(requestedDt));
      const date = url.searchParams.get('fecha') || url.searchParams.get('date');
      if (date) records = records.filter(row => String(row.fechaDespacho || row.fechaDt || row.createdAt || '').slice(0, 10) === date);
      if (endpoint === '/api/personas') {
        const cc = url.searchParams.get('cc');
        const query = url.searchParams.get('q');
        const cargo = url.searchParams.get('cargo');
        if (cc) return json({ persona: records.find(row => normal(row.CC || row.cc) === normal(cc)) || null });
        if (cargo) records = records.filter(row => normal(row.CARGO || row.cargo) === normal(cargo));
        if (query) records = records.filter(row => normal(`${row.CC || row.cc} ${row.NOMBRE || row.nombre}`).includes(normal(query)));
        return json({ personas: records });
      }
      if (endpoint === '/api/clientes') return json({ cliente: records.find(row => normal(row.codigo || row.CODIGO || row.codigoCliente) === normal(url.searchParams.get('codigo'))) || null });
      if (endpoint === '/api/capacidad-carga') {
        const row = records.find(row => normal(row.placa || row.PLACA) === normal(url.searchParams.get('placa')));
        return json({ capacidad: row ? Number(row.capacidad || row.CAPACIDAD || 0) : null });
      }
      return json(endpoint === '/api/people/profiles' ? { profiles: records } : { records });
    }
    if (method === 'PUT') {
      if (session.isAdmin && ['/api/seguimiento', '/api/checkins', '/api/asistencias'].includes(endpoint)) throw new PortalError('El administrador solo consulta este módulo.', 403);
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
      const records = endpoint === '/api/people/profiles' ? body?.profiles : body?.records;
      if (!Array.isArray(records) || records.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new PortalError('El lote de registros es inválido.', 400);
      // La sincronización por reemplazo necesita transacción de servidor para no perder datos.
      if (['/api/seguimiento', '/api/checkins', '/api/asistencias'].includes(endpoint)) {
        throw new PortalError('La sincronización de este módulo necesita la operación transaccional de Dataverse. No se han guardado cambios.', 501);
      }
      const saved = await upsertRecords(endpoint, records);
      return json(endpoint === '/api/people/profiles' ? { profiles: saved } : { records: saved });
    }
    if (method === 'DELETE' && ['/api/modulaciones', '/api/punto-corona-routes'].includes(endpoint)) {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
      const ids = body?.ids || (url.searchParams.get('id') ? [url.searchParams.get('id')] : null);
      if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id)) throw new PortalError('Identificadores inválidos.', 400);
      await deleteRecords(endpoint, ids);
      return json({ ok: true });
    }
    throw new PortalError(`Operación pendiente de adaptación: ${method} ${endpoint}.`, 501);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de Power Pages.';
    const status = error instanceof PortalError ? error.status : 500;
    if (status === 503 && method === 'GET') return emptyGet(endpoint);
    window.dispatchEvent(new CustomEvent('transport:portal-error', { detail: message }));
    return json({ error: message }, status);
  }
}
