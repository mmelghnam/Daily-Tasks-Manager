import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const defaultDashboardSections = [
  "summary",
  "events",
  "productivity",
  "links",
  "notifications",
  "taskMap",
] as const;

export type DashboardSection = (typeof defaultDashboardSections)[number];

export const dashboardPreferencesTable = pgTable("dashboard_preferences", {
  ownerId: text("owner_id").primaryKey(),
  visibleSections: jsonb("visible_sections").$type<string[]>().notNull().default([...defaultDashboardSections]),
  sectionOrder: jsonb("section_order").$type<string[]>().notNull().default([...defaultDashboardSections]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});