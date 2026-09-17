import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const inboxItemsTable = sqliteTable(
  "inbox_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerCreatedIdx: index("inbox_items_owner_created_idx").on(table.ownerId, table.createdAt),
  }),
);

export type InboxItem = typeof inboxItemsTable.$inferSelect;
