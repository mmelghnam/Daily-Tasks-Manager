---
name: Palette completeness
description: Theme switching must replace every surface token used by menus and overlays.
---

Every selectable palette must define the full surface set, especially popover background, foreground, and border; custom palettes should derive popover values from card values.

**Why:** Missing tokens remain on the document root when switching themes, so a previous dark theme can make a light palette's task menu appear black or unreadable.

**How to apply:** When adding a palette or surface component, update the theme token map and verify switching from dark to light and light to dark in both menus and dialogs.