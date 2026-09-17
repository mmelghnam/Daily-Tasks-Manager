import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import express from "express";
import { beforeAll, describe, expect, it } from "vitest";
import {
  appSettingsTable,
  appUsersTable,
  dashboardPreferencesTable,
  defaultDashboardSections,
  legacyOwnershipSettingKey,
  type AppDatabase,
  withRequestContext,
} from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import { eq } from "drizzle-orm";
import preferencesRouter from "./routes/preferences";
import onboardingRouter from "./routes/onboarding";
import { provisionUserAndClaimLegacyData } from "./middlewares/auth";

let testDb: AppDatabase;
const userId = "fresh-clerk-user";

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/fresh-account-settings-${process.pid}-${Date.now()}.sqlite`,
  );
});

describe("fresh account settings", () => {
  it("initializes a Clerk user and serves default dashboard settings", async () => {
    await provisionUserAndClaimLegacyData(userId, testDb);

    const [user] = await testDb
      .select({ userId: appUsersTable.userId })
      .from(appUsersTable)
      .where(eq(appUsersTable.userId, userId));
    const [claim] = await testDb
      .select({ value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, legacyOwnershipSettingKey));
    const [preferences] = await testDb
      .select({
        visibleSections: dashboardPreferencesTable.visibleSections,
        sectionOrder: dashboardPreferencesTable.sectionOrder,
      })
      .from(dashboardPreferencesTable)
      .where(eq(dashboardPreferencesTable.ownerId, userId));

    expect(user).toEqual({ userId });
    expect(claim).toEqual({ value: userId });
    expect(preferences).toEqual({
      visibleSections: [...defaultDashboardSections],
      sectionOrder: [...defaultDashboardSections],
    });

    const api = express();
    api.use((req, _res, next) => {
      Object.assign(req, { userId });
      next();
    });
    api.use("/api", preferencesRouter);
    api.use("/api", onboardingRouter);

    const server = createServer((request, response) => {
      withRequestContext({ database: testDb }, () => {
        api(request, response);
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      const onboardingResponse = await fetch(`http://127.0.0.1:${port}/api/onboarding`);
      expect(onboardingResponse.status).toBe(200);
      expect(await onboardingResponse.json()).toEqual({
        completed: false,
        usageType: null,
      });

      const response = await fetch(`http://127.0.0.1:${port}/api/preferences/dashboard`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        visibleSections: [...defaultDashboardSections],
        sectionOrder: [...defaultDashboardSections],
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});