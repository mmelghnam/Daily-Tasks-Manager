---
name: Task scheduling fields
description: Durable rules for optional task time planning data.
---

Task scheduling metadata is optional so legacy tasks remain valid. When a user removes an existing start time or duration, the update request must send explicit `null` values rather than omitting the fields.

**Why:** Omitting an emptied form field makes the server preserve the previous schedule, which is surprising and makes the daily plan inaccurate.

**How to apply:** Keep create payloads compatible with optional input fields, while update payloads use nullable fields and send `null` for cleared values. Copies and recurring task creation should preserve the source schedule.