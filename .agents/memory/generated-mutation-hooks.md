---
name: Generated mutation hooks
description: A client-side stability lesson for adding generated API mutations to already-rendered components.
---

When a newly generated mutation hook causes an invalid-hook error in an existing component, prefer the generated imperative API function for that isolated action and keep React Query hooks for stable shared mutations. Recheck the component after a clean workflow restart.

**Why:** The task card remained usable with its existing hooks, but adding the newly generated copy mutation hook produced an invalid-hook error while the API request path itself was healthy.

**How to apply:** Treat an invalid-hook error in a component as a client module/rendering problem first, not as an API failure. Replace only the problematic isolated hook with an imperative call, preserve pending state locally, and verify TypeScript, build, and browser logs.