CREATE TABLE `inbox_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_id` text NOT NULL,
  `title` text NOT NULL,
  `notes` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inbox_items_owner_created_idx` ON `inbox_items` (`owner_id`, `created_at`);
