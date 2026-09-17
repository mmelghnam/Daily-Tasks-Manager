import { customType } from "drizzle-orm/sqlite-core";

export const sqliteDateOnly = customType<{
  data: Date;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return value.toISOString().slice(0, 10);
  },
  fromDriver(value) {
    return new Date(`${value}T00:00:00.000Z`);
  },
});

export function sqliteJson<T>() {
  return customType<{
    data: T;
    driverData: string;
  }>({
    dataType() {
      return "text";
    },
    toDriver(value) {
      return JSON.stringify(value);
    },
    fromDriver(value) {
      return JSON.parse(value) as T;
    },
  });
}

/**
 * JSON arrays are persisted as TEXT in SQLite/D1. Legacy rows can therefore
 * contain valid JSON that is not an array (for example `null`) or malformed
 * JSON. Returning an empty array keeps collection contracts stable at runtime
 * and prevents consumers from crashing on `.length`, `.map`, or `.filter`.
 */
export function sqliteJsonArray<T>() {
  return customType<{
    data: T[];
    driverData: string;
  }>({
    dataType() {
      return "text";
    },
    toDriver(value) {
      return JSON.stringify(value);
    },
    fromDriver(value) {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    },
  });
}
