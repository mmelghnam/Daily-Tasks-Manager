import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Minimal local record for a Clerk identity. Clerk remains the source of truth
 * for profile data; this table only supports application ownership.
 */
export const appUsersTable = pgTable("app_users", {
  userId: text("user_id").primaryKey(),
  usageType: text("usage_type"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Singleton application settings. `legacyOwnershipClaimed` is written only by
 * the winning first authenticated user while legacy records are claimed.
 */
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const legacyOwnershipSettingKey = "legacy_ownership_claimed";