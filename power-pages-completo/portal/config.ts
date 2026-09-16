export type TableConfig = {
  entitySet: string;
  id: string;
  key: string;
  name: string;
  payload: string;
  maxPayloadLength: number;
};

// No se adivinan los nombres del nuevo entorno. Completar después de crear tablas.
export const tables: Record<string, TableConfig | null> = {
  '/api/seguimiento': null,
  '/api/asistencias': null,
  '/api/modulaciones': null,
  '/api/checkins': null,
  '/api/punto-corona-routes': null,
  '/api/personas': null,
  '/api/clientes': null,
  '/api/capacidad-carga': null,
  '/api/people/profiles': null,
  '/api/admin/audit-logs': null,
};
