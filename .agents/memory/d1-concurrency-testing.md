---
name: D1 concurrency testing
description: The limitation of the local LibSQL adapter when testing concurrent ownership transactions.
---

The local LibSQL adapter can fail concurrent write transactions with `SQLITE_BUSY`, even when the production D1 transaction behavior is the behavior being tested. Keep local tests deterministic and use a D1-compatible harness when validating ownership races.

**Why:** Replacing PostgreSQL with a file-backed SQLite adapter exposed locking behavior that is not a meaningful substitute for the production D1 concurrency test.

**How to apply:** Treat local ownership tests as atomicity/idempotency checks, and keep a separate D1 or equivalent integration test for simultaneous claims and onboarding requests.