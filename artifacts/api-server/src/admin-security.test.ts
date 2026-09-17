import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppDatabase, withRequestContext } from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import { provisionUserAndClaimLegacyData } from "./middlewares/auth";
import adminRouter from "./routes/admin";

const candidateUser = "first-user-must-not-become-admin";

let testDb: AppDatabase;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/admin-security-${process.pid}-${Date.now()}.sqlite`,
  );

  // Create a real first account so this test catches any regression that
  // accidentally restores the old "first user becomes admin" fallback.
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
  it("does not promote the first account when ADMIN_USER_ID is empty", async () => {
    const headers = { "x-test-user": candidateUser };

    const access = await fetch(`${baseUrl}/api/admin/access`, { headers });
    expect(access.status).toBe(200);
    expect(await access.json()).toEqual({ isAdmin: false });

    const stats = await fetch(`${baseUrl}/api/admin/stats`, { headers });
    expect(stats.status).toBe(403);
    expect(await stats.json()).toEqual({ error: "Admin access required" });

    const notification = await fetch(`${baseUrl}/api/admin/notifications`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ title: "blocked", body: "blocked" }),
    });
    expect(notification.status).toBe(403);
    expect(await notification.json()).toEqual({ error: "Admin access required" });
  });
});
