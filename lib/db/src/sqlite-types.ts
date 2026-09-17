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