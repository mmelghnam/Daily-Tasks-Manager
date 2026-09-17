import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import type { AppDatabase } from "./index";

const localSchema = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS app_users (
  user_id TEXT PRIMARY KEY NOT NULL,
  usage_type TEXT,
  onboarded_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS task_spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  owner_id TEXT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2e8d77',
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CONSTRAINT task_spaces_owner_name_idx UNIQUE (owner_id, name)
);
CREATE TABLE IF NOT EXISTS daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  task_date TEXT NOT NULL,
  owner_id TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_time TEXT,
  duration_minutes INTEGER,
  recurrence TEXT,
  due_date TEXT,
  subtasks TEXT NOT NULL DEFAULT '[]',
  completed INTEGER NOT NULL DEFAULT 0,
  links TEXT NOT NULL DEFAULT '[]',
  follow_ups TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS daily_tasks_owner_task_date_idx
  ON daily_tasks (owner_id, task_date);
CREATE TABLE IF NOT EXISTS countdown_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  owner_id TEXT,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#d39a2f',
  image_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS space_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  owner_id TEXT,
  space_id INTEGER NOT NULL REFERENCES task_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  owner_id TEXT PRIMARY KEY NOT NULL,
  visible_sections TEXT NOT NULL DEFAULT '[]',
  section_order TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,
  current INTEGER NOT NULL DEFAULT 0,
  deadline TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS goals_owner_idx ON goals (owner_id);
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  streak INTEGER NOT NULL DEFAULT 0,
  last_completed TEXT,
  completed_dates TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS habits_owner_idx ON habits (owner_id);
CREATE TABLE IF NOT EXISTS study_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'subject',
  title TEXT NOT NULL,
  subject TEXT,
  item_date TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS study_items_owner_date_idx ON study_items (owner_id, item_date);
CREATE TABLE IF NOT EXISTS broadcast_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`;

export async function createLocalDatabase(
  url = "file:.data/daily-tasks.sqlite",
): Promise<AppDatabase> {
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length).split("?")[0];
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const client = createClient({ url });
  await client.executeMultiple(localSchema);
  const habitColumns = await client.execute("PRAGMA table_info(habits)");
  if (!habitColumns.rows.some((column) => column.name === "completed_dates")) {
    await client.execute("ALTER TABLE habits ADD COLUMN completed_dates TEXT NOT NULL DEFAULT '[]'");
  }
  return drizzle(client, { schema }) as unknown as AppDatabase;
}