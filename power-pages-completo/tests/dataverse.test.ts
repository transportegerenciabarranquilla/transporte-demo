import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { tables } from '../src/portal/config.ts';
import { readRecords, recordKey, requestDataverse, upsertRecords } from '../src/portal/dataverse.ts';

const originalFetch = globalThis.fetch;
const testTable = { entitySet: 'cr904_tests', id: 'cr904_testid', key: 'cr904_key', name: 'cr904_name', payload: 'cr904_data', maxPayloadLength: 1000 };
const guid = '00000000-0000-0000-0000-000000000001';
Object.assign(globalThis, {
  window: { location: { origin: 'https://example.powerappsportals.com' } },
  DOMParser: class { parseFromString() { return { querySelector: () => ({ value: 'csrf-test' }) }; } },
});
afterEach(() => { globalThis.fetch = originalFetch; delete tables['/test']; });

test('tabla no configurada falla sin llamar a la red', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(); };
  await assert.rejects(readRecords('/missing'), /Falta configurar/);
  assert.equal(calls, 0);
});

test('clave estable distingue contratistas y fechas de ruta', () => {
  const a = recordKey('/api/seguimiento', { transportista: 'A', transporte: '123', fechaDespacho: '2026-09-16' });
  assert.notEqual(a, recordKey('/api/seguimiento', { transportista: 'B', transporte: '123', fechaDespacho: '2026-09-16' }));
  assert.notEqual(a, recordKey('/api/seguimiento', { transportista: 'A', transporte: '123', fechaDespacho: '2026-09-17' }));
  assert.throws(() => recordKey('/api/seguimiento', {}), /clave estable/);
});

test('lectura conserva CSRF y sigue paginación del mismo portal', async () => {
  tables['/test'] = testTable;
  let pages = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/_layout/tokenhtml')) return new Response('<input>');
    assert.equal(new Headers(init?.headers).get('__RequestVerificationToken'), 'csrf-test');
    assert.equal(init?.credentials, 'same-origin');
    pages++;
    return Response.json({ value: [{ cr904_testid: guid, cr904_key: `key-${pages}`, cr904_data: JSON.stringify({ id: pages }) }], ...(pages === 1 ? { '@odata.nextLink': '/_api/cr904_tests?$skiptoken=2' } : {}) });
  };
  assert.deepEqual(await readRecords('/test'), [{ id: 1 }, { id: 2 }]);
  assert.equal(pages, 2);
});

test('rechaza enlaces fuera del portal sin transmitir CSRF', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(); };
  await assert.rejects(requestDataverse('https://evil.example/_api/test'), /inválida/);
  assert.equal(calls, 0);
});

test('JSON dañado no se convierte silenciosamente en lista vacía', async () => {
  tables['/test'] = testTable;
  globalThis.fetch = async url => String(url).includes('/_layout/') ? new Response('<input>') : Response.json({ value: [{ cr904_testid: guid, cr904_key: 'x', cr904_data: 'broken' }] });
  await assert.rejects(readRecords('/test'), /JSON dañado/);
});

test('prevalida tamaño del lote antes de mutar Dataverse', async () => {
  tables['/test'] = { ...testTable, maxPayloadLength: 30 };
  let writes = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/_layout/')) return new Response('<input>');
    if (init?.method && init.method !== 'GET') writes++;
    return Response.json({ value: [] });
  };
  await assert.rejects(upsertRecords('/test', [{ id: 'one' }, { id: 'two', detail: 'x'.repeat(100) }]), /tamaño/);
  assert.equal(writes, 0);
});
