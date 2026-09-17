import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import {
  type AppDatabase,
  appSettingsTable,
  appUsersTable,
  eventsTable,
  legacyOwnershipSettingKey,
  spaceLinksTable,
  spacesTable,
  tasksTable,
} from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import { provisionUserAndClaimLegacyData } from "./middlewares/auth";
import { completeOnboarding } from "./routes/onboarding";

let testDb: AppDatabase;

const firstUser = "concurrency-user-a";
const secondUser = "concurrency-user-b";

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/ownership-concurrency-${process.pid}-${Date.now()}.sqlite`,
  );

  const [legacySpace] = await testDb.insert(spacesTable).values({
    ownerId: null,
    name: "legacy-space",
    color: "#123456",
  }).returning({ id: spacesTable.id });
  await testDb.insert(tasksTable).values({
    ownerId: null,
    taskDate: new Date("2026-09-08T00:00:00.000Z"),
    category: "legacy-space",
    title: "legacy-task",
  });
  await testDb.insert(eventsTable).values({
    ownerId: null,
    title: "legacy-event",
    startDate: new Date("2026-09-08T00:00:00.000Z"),
    endDate: new Date("2026-09-09T00:00:00.000Z"),
  });
  await testDb.insert(spaceLinksTable).values({
    ownerId: null,
    spaceId: legacySpace.id,
    title: "legacy-link",
    url: "https://example.com",
  });
});

describe("account ownership", () => {
  it("allows only one of two first users to claim all legacy data", async () => {
    await provisionUserAndClaimLegacyData(firstUser, testDb);
    await provisionUserAndClaimLegacyData(secondUser, testDb);

    const [claim] = await testDb
      .select({ ownerId: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, legacyOwnershipSettingKey));
    expect([firstUser, secondUser]).toContain(claim?.ownerId);

    const losingUser = claim.ownerId === firstUser ? secondUser : firstUser;
    const legacySpaces = await testDb
      .select({ ownerId: spacesTable.ownerId })
      .from(spacesTable)
      .where(eq(spacesTable.name, "legacy-space"));
    const legacyTasks = await testDb
      .select({ ownerId: tasksTable.ownerId })
      .from(tasksTable)
      .where(eq(tasksTable.title, "legacy-task"));

    expect(legacySpaces).toEqual([{ ownerId: claim.ownerId }]);
    expect(legacyTasks).toEqual([{ ownerId: claim.ownerId }]);
    expect(legacySpaces.some((row) => row.ownerId === losingUser)).toBe(false);
    expect(legacyTasks.some((row) => row.ownerId === losingUser)).toBe(false);
  });

  it("creates one starter template when the same account onboards twice", async () => {
    const results = [
      await completeOnboarding(firstUser, "student", new Date("2026-09-08T00:00:00.000Z"), testDb),
      await completeOnboarding(firstUser, "student", new Date("2026-09-08T00:00:00.000Z"), testDb),
    ];

    expect(results.filter(Boolean)).toHaveLength(1);

    const starterSpaces = await testDb
      .select({ name: spacesTable.name })
      .from(spacesTable)
      .where(and(
        eq(spacesTable.ownerId, firstUser),
        inArray(spacesTable.name, ["الدراسة", "الواجبات", "الحياة"]),
      ));
    const starterTasks = await testDb
      .select({ title: tasksTable.title })
      .from(tasksTable)
      .where(and(
        eq(tasksTable.ownerId, firstUser),
        inArray(tasksTable.title, [
          "راجع أهم درس اليوم",
          "حدّد أقرب موعد تسليم",
          "خصص وقتاً للراحة",
        ]),
      ));

    expect(starterSpaces).toHaveLength(3);
    expect(starterTasks).toHaveLength(3);
  });

  it("keeps each account's spaces and tasks invisible to the other account", async () => {
    await completeOnboarding(
      secondUser,
      "employee",
      new Date("2026-09-08T00:00:00.000Z"),
      testDb,
    );

    const firstSpaces = await testDb
      .select({ ownerId: spacesTable.ownerId })
      .from(spacesTable)
      .where(eq(spacesTable.ownerId, firstUser));
    const secondSpaces = await testDb
      .select({ ownerId: spacesTable.ownerId })
      .from(spacesTable)
      .where(eq(spacesTable.ownerId, secondUser));
    const firstTasks = await testDb
      .select({ ownerId: tasksTable.ownerId })
      .from(tasksTable)
      .where(eq(tasksTable.ownerId, firstUser));
    const secondTasks = await testDb
      .select({ ownerId: tasksTable.ownerId })
      .from(tasksTable)
      .where(eq(tasksTable.ownerId, secondUser));

    expect(firstSpaces.every((row) => row.ownerId === firstUser)).toBe(true);
    expect(secondSpaces.every((row) => row.ownerId === secondUser)).toBe(true);
    expect(firstTasks.every((row) => row.ownerId === firstUser)).toBe(true);
    expect(secondTasks.every((row) => row.ownerId === secondUser)).toBe(true);
    expect(firstSpaces).not.toHaveLength(0);
    expect(secondSpaces).not.toHaveLength(0);
    expect(firstTasks).not.toHaveLength(0);
    expect(secondTasks).not.toHaveLength(0);
  });
});