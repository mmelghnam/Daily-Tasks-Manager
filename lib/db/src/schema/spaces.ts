import { createInsertSchema } from "drizzle-zod";
import { date, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const spacesTable = pgTable(
  "task_spaces",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#2e8d77"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex("task_spaces_name_idx").on(table.name),
  }),
);

export const insertSpaceSchema = createInsertSchema(spacesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSpace = z.infer<typeof insertSpaceSchema>;
export type Space = typeof spacesTable.$inferSelect;