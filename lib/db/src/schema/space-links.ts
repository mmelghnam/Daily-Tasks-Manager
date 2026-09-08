import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { spacesTable } from "./spaces";

export const spaceLinksTable = pgTable("space_links", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id").notNull().references(() => spacesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpaceLinkSchema = createInsertSchema(spaceLinksTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSpaceLink = z.infer<typeof insertSpaceLinkSchema>;
export type SpaceLink = typeof spaceLinksTable.$inferSelect;