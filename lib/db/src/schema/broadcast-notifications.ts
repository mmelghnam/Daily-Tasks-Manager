import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const broadcastNotificationsTable = pgTable("broadcast_notifications", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BroadcastNotification = typeof broadcastNotificationsTable.$inferSelect;