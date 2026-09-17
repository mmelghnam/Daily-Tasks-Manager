import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Minimal local record for a Clerk identity. Clerk remains the source of truth
 * for profile data; this table only supports application ownership.
 */
export const appUsersTable = sqliteTable("app_users", {
  userId: text("user_id").primaryKey(),
  usageType: text("usage_type"),
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * Singleton application settings. `legacyOwnershipClaimed` is written only by
 * the winning first authenticated user while legacy records are claimed.
 */
export const appSettingsTable = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const legacyOwnershipSettingKey = "legacy_ownership_claimed";