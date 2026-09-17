import { createInsertSchema } from "drizzle-zod";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const spacesTable = sqliteTable(
  "task_spaces",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: text("owner_id"),
    name: text("name").notNull(),
    color: text("color").notNull().default("#2e8d77"),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerNameIdx: uniqueIndex("task_spaces_owner_name_idx").on(table.ownerId, table.name),
  }),
);

export const insertSpaceSchema = createInsertSchema(spacesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSpace = z.infer<typeof insertSpaceSchema>;
export type Space = typeof spacesTable.$inferSelect;