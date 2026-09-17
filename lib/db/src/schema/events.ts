import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sqliteDateOnly } from "../sqlite-types";

export const eventsTable = sqliteTable("countdown_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id"),
  title: text("title").notNull(),
  startDate: sqliteDateOnly("start_date").notNull(),
  endDate: sqliteDateOnly("end_date").notNull(),
  color: text("color").notNull().default("#d39a2f"),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;