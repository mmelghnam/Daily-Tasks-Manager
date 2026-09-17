import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { sqliteJsonArray } from "../sqlite-types";

export const defaultDashboardSections = [
  "dateHeader",
  "viewMode",
  "summary",
  "dailyPlan",
  "productivity",
  "focusTools",
  "links",
  "taskMap",
  "tasks",
] as const;

export type DashboardSection = (typeof defaultDashboardSections)[number];

export const dashboardPreferencesTable = sqliteTable("dashboard_preferences", {
  ownerId: text("owner_id").primaryKey(),
  visibleSections: sqliteJsonArray<string>()("visible_sections").notNull().default([...defaultDashboardSections]),
  sectionOrder: sqliteJsonArray<string>()("section_order").notNull().default([...defaultDashboardSections]),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
