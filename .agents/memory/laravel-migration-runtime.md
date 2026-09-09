---
name: Laravel migration runtime
description: Runtime constraints for the Laravel replacement service during the empty-MySQL migration.
---

The Laravel replacement uses a new empty MySQL database; the scaffold SQLite file is intentionally absent. The static web shell is authenticated through Clerk Bearer tokens, so it does not need Laravel sessions or CSRF state. API health must remain unauthenticated and the API itself must fail closed when Clerk JWT configuration is missing.

**Why:** Laravel's default database-backed session and cache settings try to open the removed SQLite file before the web page renders, producing a misleading 500 unrelated to the Blade or API code.

**How to apply:** Configure the target environment from `.env.example` with MySQL and Clerk values. For local smoke tests without MySQL, override session/cache/queue to file/file/sync and use a temporary SQLite file only for migrations; never restore `database/database.sqlite` as the application database.