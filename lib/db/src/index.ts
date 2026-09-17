import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type DrizzleD1Database, type AnyD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type AppDatabase = DrizzleD1Database<typeof schema>;
export type RuntimeEnv = Record<string, unknown> & {
  CLERK_SECRET_KEY?: string;
  ADMIN_USER_ID?: string;
};

export type RequestContext = {
  database: AppDatabase;
  env?: RuntimeEnv;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

function currentDatabase(): AppDatabase {
  const context = requestContext.getStore();
  if (!context) {
    throw new Error("A request-scoped database has not been configured.");
  }
  return context.database;
}

/**
 * Route modules import this proxy so the same handlers can run on a Worker
 * binding or against the local SQLite adapter without sharing mutable globals.
 */
export const db = new Proxy({} as AppDatabase, {
  get(_target, property) {
    const database = currentDatabase();
    const value = Reflect.get(database, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export function withDatabase<T>(database: AppDatabase, callback: () => T): T {
  return withRequestContext({ database }, callback);
}

export function withRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return requestContext.run(context, callback);
}

export function getRuntimeEnv(): RuntimeEnv | undefined {
  return requestContext.getStore()?.env;
}

export function createD1Database(binding: AnyD1Database): AppDatabase {
  return drizzle(binding, { schema });
}

export * from "./schema";