import { createInsertSchema } from "drizzle-zod";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { sqliteDateOnly, sqliteJsonArray } from "../sqlite-types";

export const taskLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export type TaskLink = z.infer<typeof taskLinkSchema>;

export const taskFollowUpSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  completed: z.boolean(),
  dueDate: z.string().nullable(),
});

export type TaskFollowUp = z.infer<typeof taskFollowUpSchema>;

export const taskSubtaskSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  completed: z.boolean(),
});

export type TaskSubtask = z.infer<typeof taskSubtaskSchema>;

export const tasksTable = sqliteTable(
  "daily_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskDate: sqliteDateOnly("task_date").notNull(),
    ownerId: text("owner_id"),
    category: text("category").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    priority: text("priority").notNull().default("medium"),
    sortOrder: integer("sort_order").notNull().default(0),
    startTime: text("start_time"),
    durationMinutes: integer("duration_minutes"),
    recurrence: text("recurrence"),
    dueDate: sqliteDateOnly("due_date"),
    subtasks: sqliteJsonArray<TaskSubtask>()("subtasks").notNull().default([]),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    links: sqliteJsonArray<TaskLink>()("links").notNull().default([]),
    followUps: sqliteJsonArray<TaskFollowUp>()("follow_ups").notNull().default([]),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerTaskDateIdx: index("daily_tasks_owner_task_date_idx").on(table.ownerId, table.taskDate),
  }),
);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
