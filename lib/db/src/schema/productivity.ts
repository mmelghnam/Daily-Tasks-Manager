import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { sqliteDateOnly, sqliteJsonArray } from "../sqlite-types";

export const goalsTable = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  target: integer("target").notNull().default(1),
  current: integer("current").notNull().default(0),
  deadline: sqliteDateOnly("deadline"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
}, (table) => ({
  ownerIdx: index("goals_owner_idx").on(table.ownerId),
}));

export const habitsTable = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  streak: integer("streak").notNull().default(0),
  lastCompleted: sqliteDateOnly("last_completed"),
  completedDates: sqliteJsonArray<string>()("completed_dates").notNull().default([]),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
}, (table) => ({
  ownerIdx: index("habits_owner_idx").on(table.ownerId),
}));

export const studyItemsTable = sqliteTable("study_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  kind: text("kind").notNull().default("subject"),
  title: text("title").notNull(),
  subject: text("subject"),
  itemDate: sqliteDateOnly("item_date"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
}, (table) => ({
  ownerDateIdx: index("study_items_owner_date_idx").on(table.ownerId, table.itemDate),
}));
