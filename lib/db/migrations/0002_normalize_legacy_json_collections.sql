-- Repair legacy JSON collection values before the application reads them.
-- D1 stores these fields as TEXT, so NOT NULL does not guarantee that the
-- decoded JSON value is actually an array.
UPDATE `daily_tasks`
SET `subtasks` = '[]'
WHERE CASE
  WHEN json_valid(`subtasks`) = 0 THEN 1
  WHEN json_type(`subtasks`) <> 'array' THEN 1
  ELSE 0
END = 1;
--> statement-breakpoint
UPDATE `daily_tasks`
SET `links` = '[]'
WHERE CASE
  WHEN json_valid(`links`) = 0 THEN 1
  WHEN json_type(`links`) <> 'array' THEN 1
  ELSE 0
END = 1;
--> statement-breakpoint
UPDATE `daily_tasks`
SET `follow_ups` = '[]'
WHERE CASE
  WHEN json_valid(`follow_ups`) = 0 THEN 1
  WHEN json_type(`follow_ups`) <> 'array' THEN 1
  ELSE 0
END = 1;
--> statement-breakpoint
UPDATE `dashboard_preferences`
SET `visible_sections` = '["summary","dailyPlan","events","productivity","links","notifications","taskMap"]'
WHERE CASE
  WHEN json_valid(`visible_sections`) = 0 THEN 1
  WHEN json_type(`visible_sections`) <> 'array' THEN 1
  ELSE 0
END = 1;
--> statement-breakpoint
UPDATE `dashboard_preferences`
SET `section_order` = '["summary","dailyPlan","events","productivity","links","notifications","taskMap"]'
WHERE CASE
  WHEN json_valid(`section_order`) = 0 THEN 1
  WHEN json_type(`section_order`) <> 'array' THEN 1
  ELSE 0
END = 1;
--> statement-breakpoint
UPDATE `habits`
SET `completed_dates` = '[]'
WHERE CASE
  WHEN json_valid(`completed_dates`) = 0 THEN 1
  WHEN json_type(`completed_dates`) <> 'array' THEN 1
  ELSE 0
END = 1;
