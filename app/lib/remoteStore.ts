"use client";

import { demoAttendances, demoCheckins, demoModulations, demoRangeReports, demoVehicles } from "./demoData";
import { notifyStorageChange } from "./storageEvents";

const KEYS: Record<string, string> = {
  "/api/asistencias": "bavaria.asistencia.registros",
  "/api/checkins": "bavaria.checkin.cajas",
  "/api/modulaciones": "bavaria.modulacion.registros",
  "/api/punto-corona-routes": "bavaria.punto-corona.routes",
  "/api/seguimiento": "bavaria.seguimiento.vehiculos",
};

const DEMO_VERSION = "v10-logisticos-range-only";

export function clearRemoteCache() {
  notifyStorageChange();
}

export function refreshRemoteRecords(endpoint: string, options: { force?: boolean } = {}) {
  void options;
  seed();
  notifyStorageChange(KEYS[endpoint]);
  return Promise.resolve();
}

export function readRemoteRecords<T>(endpoint: string): T[] {
  if (typeof window === "undefined") return [];
  seed();
  try {
    const value = JSON.parse(localStorage.getItem(KEYS[endpoint]) || "[]");
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

export function saveRemoteRecords<T>(
  endpoint: string,
  records: T[],
  options: { extraBody?: Record<string, unknown>; mergeByKey?: (item: T) => string } = {},
) {
  const key = KEYS[endpoint];
  const nextRecords = options.mergeByKey ? merge(readRemoteRecords<T>(endpoint), records, options.mergeByKey) : records;
  if (key) localStorage.setItem(key, JSON.stringify(nextRecords));
  notifyStorageChange(key);
  return Promise.resolve(nextRecords);
}

export function deleteRemoteRecords<T>(endpoint: string, ids: string[], options: { getKey?: (item: T) => string } = {}) {
  const getKey = options.getKey || ((item: T) => String((item as { id?: string }).id || ""));
  const nextRecords = readRemoteRecords<T>(endpoint).filter((item) => !ids.includes(getKey(item)));
  const key = KEYS[endpoint];
  if (key) localStorage.setItem(key, JSON.stringify(nextRecords));
  notifyStorageChange(key);
  return Promise.resolve(nextRecords);
}

function merge<T>(current: T[], incoming: T[], getKey: (item: T) => string) {
  const records = new Map(current.map((item) => [getKey(item), item]));
  incoming.forEach((item) => records.set(getKey(item), item));
  return Array.from(records.values());
}

function seed() {
  if (typeof window === "undefined" || localStorage.getItem("bavaria.local.version") === DEMO_VERSION) return;

  localStorage.setItem(KEYS["/api/seguimiento"], JSON.stringify(demoVehicles()));
  localStorage.setItem(KEYS["/api/modulaciones"], JSON.stringify(demoModulations()));
  localStorage.setItem(KEYS["/api/asistencias"], JSON.stringify(demoAttendances()));
  localStorage.setItem(KEYS["/api/checkins"], JSON.stringify(demoCheckins()));
  localStorage.setItem(KEYS["/api/punto-corona-routes"], JSON.stringify(demoRangeReports()));
  localStorage.setItem("bavaria.local.version", DEMO_VERSION);
}
