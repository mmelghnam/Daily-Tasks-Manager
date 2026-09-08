import { createInsertSchema } from "drizzle-zod";
import { boolean, date, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const taskLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export type TaskLink = z.infer<typeof taskLinkSchema>;

export const tasksTable = pgTable(
  "daily_tasks",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    taskDate: date("task_date", { mode: "string" }).notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    completed: boolean("completed").notNull().default(false),
    links: jsonb("links").$type<TaskLink[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    taskDateIdx: index("daily_tasks_task_date_idx").on(table.taskDate),
  }),
);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;