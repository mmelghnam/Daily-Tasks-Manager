---
name: Account-scoped permission caches
description: Prevent permission state from one signed-in account appearing in another account.
---

Authentication-dependent permission queries must be scoped to the active account and refreshed whenever that account changes.

**Why:** A shared permission cache can preserve an admin or non-admin result from the previously active account, causing protected links to disappear or appear incorrectly even when the server returns the right result.

**How to apply:** Include the authenticated account identifier in permission and protected-data query keys, enable them only after identity is ready, and refetch them on mount after an account transition.