import { createInsertSchema } from "drizzle-zod";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { spacesTable } from "./spaces";

export const spaceLinksTable = sqliteTable("space_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id"),
  spaceId: integer("space_id").notNull().references(() => spacesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const insertSpaceLinkSchema = createInsertSchema(spaceLinksTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSpaceLink = z.infer<typeof insertSpaceLinkSchema>;
export type SpaceLink = typeof spaceLinksTable.$inferSelect;