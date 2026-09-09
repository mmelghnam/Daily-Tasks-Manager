---
name: Task menu positioning
description: Durable positioning rule for task action menus in RTL layouts.
---

Task action menus should be rendered in a viewport-level layer anchored to the options button, not as a simple absolute child of the task card. When the button is near the left edge in RTL, flip the menu to the button's right side instead of clamping it to the viewport edge.

**Why:** RTL flex layouts can place the options button on the left side of a wide card; always opening the menu leftward makes it appear detached from the card or cut off.

**How to apply:** Measure the trigger with `getBoundingClientRect()`, clamp the menu within viewport gutters, and choose the opposite side when the preferred side lacks room.