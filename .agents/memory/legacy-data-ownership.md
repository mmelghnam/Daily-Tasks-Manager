---
name: Legacy data ownership
description: Defines who owns records created before authentication was introduced.
---

The first account that authenticates after the accounts feature is introduced becomes the owner of all previously unowned tasks, spaces, events, and links. The claim must happen atomically and only once; later accounts start with isolated, empty data.

**Why:** The user explicitly chose to preserve the existing content and transfer it to their first registered account rather than copy it to every user or discard it.

**How to apply:** Any future ownership migrations or onboarding defaults must preserve this one-time claim and must never expose or duplicate the original records for subsequent accounts.