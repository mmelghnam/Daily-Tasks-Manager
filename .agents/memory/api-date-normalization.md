---
name: API date normalization
description: OpenAPI date formats are coerced by the generated server schemas and need care when stored in JSON fields.
---

When a date is stored inside a JSON/JSONB field and sent back as a plain date string, avoid declaring that nested OpenAPI value with `format: date` unless the route deliberately converts the generated `Date` value in both directions.

**Why:** The generated Zod schemas coerce `format: date` values into `Date` objects, which can create type mismatches on insert and malformed date strings in browser code.

**How to apply:** Use a plain nullable string for JSON date fields such as follow-up dates, or normalize the generated `Date` at the API boundary before persisting and returning it.