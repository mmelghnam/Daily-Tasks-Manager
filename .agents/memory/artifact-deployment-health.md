---
name: Artifact deployment health
description: Deployment readiness rules for the monorepo's runnable API and mobile artifacts.
---

Every runnable artifact in the monorepo must expose an unauthenticated HTTP 200 readiness endpoint, and its production health probe must target the service-relative path rather than assuming the external artifact prefix.

**Why:** A single failing runnable artifact health check prevents the whole multi-artifact deployment from being promoted, even when the static web artifact builds correctly.

**How to apply:** Keep lightweight health responses outside authentication, test them against the service's local port, and define each artifact's production startup probe explicitly in its artifact configuration.