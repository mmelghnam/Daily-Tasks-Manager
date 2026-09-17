import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import express from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { type AppDatabase, withRequestContext } from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import inboxRouter from "./routes/inbox";

let testDb: AppDatabase;

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/inbox-${process.pid}-${Date.now()}.sqlite`,
  );
});

async function withApi(userId: string, run: (baseUrl: string) => Promise<void>) {
  const api = express();
  api.use(express.json());
  api.use((req, _res, next) => {
    Object.assign(req, { userId });
    next();
  });
  api.use("/api", inboxRouter);

  const server = createServer((request, response) => {
    withRequestContext({ database: testDb }, () => api(request, response));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await run(`http://127.0.0.1:${port}/api`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("inbox API", () => {
  it("creates, lists, and deletes account-scoped inbox items", async () => {
    let itemId = 0;

    await withApi("inbox-user-a", async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/inbox`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "فكرة سريعة", notes: "رتبها لاحقاً" }),
      });
      expect(createResponse.status).toBe(201);
      const created = await createResponse.json() as { id: number; title: string };
      itemId = created.id;
      expect(created.title).toBe("فكرة سريعة");

      const listResponse = await fetch(`${baseUrl}/inbox`);
      expect(listResponse.status).toBe(200);
      const items = await listResponse.json() as Array<{ id: number; title: string }>;
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe(itemId);
    });

    await withApi("inbox-user-b", async (baseUrl) => {
      const listResponse = await fetch(`${baseUrl}/inbox`);
      expect(await listResponse.json()).toEqual([]);

      const deleteResponse = await fetch(`${baseUrl}/inbox/${itemId}`, { method: "DELETE" });
      expect(deleteResponse.status).toBe(404);
    });

    await withApi("inbox-user-a", async (baseUrl) => {
      const deleteResponse = await fetch(`${baseUrl}/inbox/${itemId}`, { method: "DELETE" });
      expect(deleteResponse.status).toBe(204);
      const listResponse = await fetch(`${baseUrl}/inbox`);
      expect(await listResponse.json()).toEqual([]);
    });
  });

  it("rejects empty captures", async () => {
    await withApi("inbox-validation-user", async (baseUrl) => {
      const response = await fetch(`${baseUrl}/inbox`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      });
      expect(response.status).toBe(400);
    });
  });
});
