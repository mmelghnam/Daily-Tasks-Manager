import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import express from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { habitsTable, type AppDatabase, withRequestContext } from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import { and, eq } from "drizzle-orm";
import productivityRouter from "./routes/productivity";

let testDb: AppDatabase;
const userId = "habit-create-user";

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/habit-create-${process.pid}-${Date.now()}.sqlite`,
  );
});

describe("habit creation", () => {
  it("creates a fresh daily habit with empty completion history", async () => {
    const api = express();
    api.use((req, _res, next) => {
      Object.assign(req, { userId });
      next();
    });
    api.use(express.json());
    api.use("/api", productivityRouter);

    const server = createServer((request, response) => {
      withRequestContext({ database: testDb }, () => {
        api(request, response);
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/habits`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "قراءة", frequency: "daily" }),
      });

      expect(response.status).toBe(201);
      const body = await response.json() as {
        id: number;
        name: string;
        frequency: string;
        streak: number;
        lastCompleted: string | null;
        completedDates: string[];
      };
      expect(body.name).toBe("قراءة");
      expect(body.frequency).toBe("daily");
      expect(body.streak).toBe(0);
      expect(body.lastCompleted).toBeNull();
      expect(body.completedDates).toEqual([]);

      const [stored] = await testDb
        .select()
        .from(habitsTable)
        .where(and(eq(habitsTable.id, body.id), eq(habitsTable.ownerId, userId)));

      expect(stored.completedDates).toEqual([]);
      expect(stored.lastCompleted).toBeNull();
      expect(stored.streak).toBe(0);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
