---
name: API date normalization
description: OpenAPI date formats are coerced by generated server schemas and must be normalized at JSON response boundaries.
---

Generated server schemas coerce OpenAPI date and date-time fields into `Date` objects. Before sending JSON, normalize date-only fields back to `YYYY-MM-DD` and timestamps to ISO strings. For dates inside JSON/JSONB, use plain strings unless the route deliberately converts them in both directions.

**Why:** Sending coerced date-only values directly through JSON turns them into full timestamps. Browser code that appends a time to those values then creates malformed dates and can crash with `RangeError: Invalid time value`.

**How to apply:** Normalize generated `Date` outputs at every API response boundary, and still validate dates before calling `toISOString` or `Intl.DateTimeFormat` in the UI.