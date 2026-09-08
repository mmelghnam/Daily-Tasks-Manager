---
name: Primary admin and broadcasts
description: The ownership rule for the main admin account and the current delivery model for app-wide announcements.
---

The primary admin is the earliest authenticated application account unless an explicit server-side admin user ID is configured. Admin statistics and broadcast creation are protected on the server, not only hidden in the UI. Broadcast announcements are persisted and displayed inside the app; native push delivery is a separate future capability.

**Why:** The product needed a safe initial admin without putting a user identifier in client code, while avoiding an unconfigured external push provider.

**How to apply:** Keep all admin checks server-side and treat in-app announcements as the current guaranteed delivery channel. Add device push only with a real permission/token/provider flow.