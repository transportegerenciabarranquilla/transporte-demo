export type Vehicle = {
  id?: string;
  key: string;
  dt: string;
  plate: string;
  responsible: string;
  territory: string;
  dispatchDate: string;
  boxes: number;
  hl: number;
  customers: number;
  visited: number;
  departureTime: string;
  arrivalTime: string;
  plannedTime: string;
  status: string;
  checkinBoxes?: number;
  checkinUpdatedAt?: string;
  modulatedBoxes?: number;
  managedBoxes?: number;
  reliefTime?: string;
  reliefResponsible?: string;
};

export const STATUSES = [
  "Pendiente por salir",
  "Cargando",
  "En ruta",
  "Retornando",
  "Pernoctado",
  "Cambio de fecha",
  "Finalizado",
] as const;
