import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppDatabase, withRequestContext } from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import app from "./app";

let testDb: AppDatabase;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/auth-security-${process.pid}-${Date.now()}.sqlite`,
  );

  server = createServer((request, response) => {
    withRequestContext(
      {
        database: testDb,
        // A non-empty test value is enough to exercise Clerk token verification.
        // The malformed tokens below must fail before any account provisioning.
        env: { CLERK_SECRET_KEY: "sk_test_invalid_regression_value" },
      },
      () => app(request, response),
    );
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Auth security test server did not bind");
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("authentication failure handling", () => {
  it("returns 401 instead of 500 for an invalid bearer session", async () => {
    const response = await fetch(`${baseUrl}/api/tasks`, {
      headers: { authorization: "Bearer definitely-not-a-jwt" },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 instead of 500 for an invalid Clerk session cookie", async () => {
    const response = await fetch(`${baseUrl}/api/tasks`, {
      headers: { cookie: "__session=definitely-not-a-jwt" },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
