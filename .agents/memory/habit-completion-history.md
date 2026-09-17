---
name: Habit completion history
description: Daily habit streaks require date-level completion history instead of inferring state from one last date.
---

Store each completed calendar date for a daily habit and derive the current consecutive streak from the sorted dates. Treat a repeated check on the same date as a toggle, and use the selected local calendar date rather than UTC timestamps.

**Why:** A single `lastCompleted` value cannot tell whether a habit was completed on earlier days or whether a selected day is already checked; UTC conversion also crosses calendar boundaries for users near midnight.

**How to apply:** Any web or mobile habit UI should send a validated `YYYY-MM-DD` date to the shared completion operation and render checked state from the returned date list.