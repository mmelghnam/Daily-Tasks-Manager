---
name: D1 onboarding transactions
description: Keep first-auth account provisioning compatible with Cloudflare D1 request execution.
---

Cloudflare D1 first-auth provisioning should use idempotent single-statement writes rather than relying on an interactive transaction around the onboarding request.

**Why:** The production onboarding request was returning 500 before its status query, while the same initialization worked with the local LibSQL adapter; the request path depended on interactive transaction behavior that is not safe to assume for D1.

**How to apply:** Keep user/default-settings inserts idempotent, use the app-settings primary-key insert as the one-time ownership lock, and log each D1 operation server-side without identifiers or credentials.