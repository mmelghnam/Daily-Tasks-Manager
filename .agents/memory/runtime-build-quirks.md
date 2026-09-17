---
name: Runtime build quirks
description: Non-obvious local build constraints for the API native adapter and Expo static export.
---

The API server bundle must externalize `@libsql/client` so its dynamic native-driver lookup runs from the package installation rather than from the bundled `dist` directory.

**Why:** Bundling the client makes the local Node adapter fail to resolve `@libsql/linux-x64-gnu`; the Worker path does not use the local adapter and remains D1-based.

**How to apply:** Keep `@libsql/client` in the API build external list and verify the built server starts after dependency or bundler changes.

The static Expo build must use a configurable Metro port that is separate from the mockup sandbox service.

**Why:** The mockup service occupies port 8081 during workspace builds, and Expo's non-interactive exporter otherwise prompts for another port and times out.

**How to apply:** Use `EXPO_METRO_PORT` for the build script, defaulting to 8082, and use that base URL for health, bundles, manifests, and assets.