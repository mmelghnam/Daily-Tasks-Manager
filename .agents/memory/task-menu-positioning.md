---
name: Task menu positioning
description: Durable positioning rule for task action menus in RTL layouts.
---

Task action menus should be rendered in a viewport-level layer anchored to the options button, not as a simple absolute child of the task card. In RTL, clamp the menu to viewport gutters and keep it below the trigger when possible; only move it upward by the minimum amount needed when the viewport is short. Portal menus also need pointer-leave, outside-click, and Escape dismissal.

**Why:** RTL flex layouts can place the options button on the left side of a wide card, while an oversized estimated menu height can make a lower card's menu jump far above its trigger or appear detached.

**How to apply:** Measure the trigger with `getBoundingClientRect()`, clamp the menu within viewport gutters, and choose the opposite side when the preferred side lacks room.