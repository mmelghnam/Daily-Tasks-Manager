import { boolean, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  target: integer("target").notNull().default(1),
  current: integer("current").notNull().default(0),
  deadline: date("deadline", { mode: "string" }),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index("goals_owner_idx").on(table.ownerId),
}));

export const habitsTable = pgTable("habits", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  streak: integer("streak").notNull().default(0),
  lastCompleted: date("last_completed", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index("habits_owner_idx").on(table.ownerId),
}));

export const studyItemsTable = pgTable("study_items", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  ownerId: text("owner_id").notNull(),
  kind: text("kind").notNull().default("subject"),
  title: text("title").notNull(),
  subject: text("subject"),
  itemDate: date("item_date", { mode: "string" }),
  completed: boolean("completed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerDateIdx: index("study_items_owner_date_idx").on(table.ownerId, table.itemDate),
}));