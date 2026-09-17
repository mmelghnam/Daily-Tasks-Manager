CREATE TABLE `daily_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_date` text NOT NULL,
	`owner_id` text,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`start_time` text,
	`duration_minutes` integer,
	`recurrence` text,
	`due_date` text,
	`subtasks` text DEFAULT '[]' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`follow_ups` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `daily_tasks_owner_task_date_idx` ON `daily_tasks` (`owner_id`,`task_date`);--> statement-breakpoint
CREATE TABLE `task_spaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`color` text DEFAULT '#2e8d77' NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_spaces_owner_name_idx` ON `task_spaces` (`owner_id`,`name`);--> statement-breakpoint
CREATE TABLE `countdown_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`color` text DEFAULT '#d39a2f' NOT NULL,
	`image_url` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dashboard_preferences` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`visible_sections` text DEFAULT '["summary","events","productivity","links","notifications","taskMap"]' NOT NULL,
	`section_order` text DEFAULT '["summary","events","productivity","links","notifications","taskMap"]' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `space_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text,
	`space_id` integer NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`space_id`) REFERENCES `task_spaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`usage_type` text,
	`onboarded_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `broadcast_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`target` integer DEFAULT 1 NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`deadline` text,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `goals_owner_idx` ON `goals` (`owner_id`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`last_completed` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `habits_owner_idx` ON `habits` (`owner_id`);--> statement-breakpoint
CREATE TABLE `study_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text DEFAULT 'subject' NOT NULL,
	`title` text NOT NULL,
	`subject` text,
	`item_date` text,
	`completed` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `study_items_owner_date_idx` ON `study_items` (`owner_id`,`item_date`);