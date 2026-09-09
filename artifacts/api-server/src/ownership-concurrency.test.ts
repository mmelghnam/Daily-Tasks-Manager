import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, inArray } from "drizzle-orm";
import pg from "pg";
import * as schema from "@workspace/db";
import {
  appSettingsTable,
  appUsersTable,
  eventsTable,
  legacyOwnershipSettingKey,
  spaceLinksTable,
  spacesTable,
  tasksTable,
} from "@workspace/db";
import { provisionUserAndClaimLegacyData } from "./middlewares/auth";
import { completeOnboarding } from "./routes/onboarding";

const { Pool } = pg;
const schemaName = `ownership_concurrency_${process.pid}_${Date.now()}`;
const adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: `-c search_path=${schemaName}`,
});
const testDb = drizzle(testPool, { schema });

const firstUser = "concurrency-user-a";
const secondUser = "concurrency-user-b";

beforeAll(async () => {
  await adminPool.query(`CREATE SCHEMA "${schemaName}"`);
  await testPool.query(`
    CREATE TABLE app_users (
      user_id text PRIMARY KEY,
      usage_type text,
      onboarded_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE app_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE task_spaces (
      id serial PRIMARY KEY,
      owner_id text,
      name text NOT NULL,
      color text NOT NULL DEFAULT '#2e8d77',
      description text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX task_spaces_owner_name_idx ON task_spaces(owner_id, name);
    CREATE TABLE daily_tasks (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      task_date date NOT NULL,
      owner_id text,
      category text NOT NULL,
      title text NOT NULL,
      notes text,
      priority text NOT NULL DEFAULT 'medium',
      sort_order integer NOT NULL DEFAULT 0,
      start_time text,
      duration_minutes integer,
      recurrence text,
      due_date date,
      subtasks jsonb NOT NULL DEFAULT '[]',
      completed boolean NOT NULL DEFAULT false,
      links jsonb NOT NULL DEFAULT '[]',
      follow_ups jsonb NOT NULL DEFAULT '[]',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE countdown_events (
      id serial PRIMARY KEY,
      owner_id text,
      title text NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      color text NOT NULL DEFAULT '#d39a2f',
      image_url text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE space_links (
      id serial PRIMARY KEY,
      owner_id text,
      space_id integer NOT NULL REFERENCES task_spaces(id) ON DELETE CASCADE,
      title text NOT NULL,
      url text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const [legacySpace] = await testDb.insert(spacesTable).values({
    ownerId: null,
    name: "legacy-space",
    color: "#123456",
  }).returning({ id: spacesTable.id });
  await testDb.insert(tasksTable).values({
    ownerId: null,
    taskDate: "2026-09-08",
    category: "legacy-space",
    title: "legacy-task",
  });
  await testDb.insert(eventsTable).values({
    ownerId: null,
    title: "legacy-event",
    startDate: "2026-09-08",
    endDate: "2026-09-09",
  });
  await testDb.insert(spaceLinksTable).values({
    ownerId: null,
    spaceId: legacySpace.id,
    title: "legacy-link",
    url: "https://example.com",
  });
});

afterAll(async () => {
  await testPool.end();
  await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await adminPool.end();
});

describe("concurrent account ownership", () => {
  it("allows only one of two simultaneous first users to claim all legacy data", async () => {
    await Promise.all([
      provisionUserAndClaimLegacyData(firstUser, testDb),
      provisionUserAndClaimLegacyData(secondUser, testDb),
    ]);

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

  it("creates one starter template when the same account onboards twice concurrently", async () => {
    const results = await Promise.all([
      completeOnboarding(firstUser, "student", "2026-09-08", testDb),
      completeOnboarding(firstUser, "student", "2026-09-08", testDb),
    ]);

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
    await completeOnboarding(secondUser, "employee", "2026-09-08", testDb);

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