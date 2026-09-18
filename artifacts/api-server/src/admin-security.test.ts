import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppDatabase, withRequestContext } from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import { provisionUserAndClaimLegacyData } from "./middlewares/auth";
import adminRouter from "./routes/admin";

const candidateUser = "legacy-owner-admin";

let testDb: AppDatabase;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/admin-security-${process.pid}-${Date.now()}.sqlite`,
  );

  // The first authenticated account owns the legacy data claim and becomes
  // the fallback primary admin only when ADMIN_USER_ID is not configured.
  await provisionUserAndClaimLegacyData(candidateUser, testDb);

  const api = express();
  api.use(express.json());
  api.use((req, _res, next) => {
    req.userId = req.header("x-test-user") ?? candidateUser;
    next();
  });
  api.use("/api", adminRouter);

  server = createServer((request, response) => {
    withRequestContext(
      { database: testDb, env: { ADMIN_USER_ID: "" } },
      () => api(request, response),
    );
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Admin security test server did not bind");
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

describe("admin configuration security", () => {
  it("uses the legacy ownership claimant as fallback admin when ADMIN_USER_ID is empty", async () => {
    const headers = { "x-test-user": candidateUser };

    const access = await fetch(`${baseUrl}/api/admin/access`, { headers });
    expect(access.status).toBe(200);
    expect(await access.json()).toEqual({ isAdmin: true });

    const stats = await fetch(`${baseUrl}/api/admin/stats`, { headers });
    expect(stats.status).toBe(200);
  });

  it("still blocks accounts that do not own the legacy claim", async () => {
    const headers = { "x-test-user": "not-the-owner" };

    const access = await fetch(`${baseUrl}/api/admin/access`, { headers });
    expect(access.status).toBe(200);
    expect(await access.json()).toEqual({ isAdmin: false });

    const stats = await fetch(`${baseUrl}/api/admin/stats`, { headers });
    expect(stats.status).toBe(403);
    expect(await stats.json()).toEqual({ error: "Admin access required" });
  });
});
