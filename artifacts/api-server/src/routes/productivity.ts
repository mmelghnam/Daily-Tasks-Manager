import { Router, type IRouter } from "express";
import {
  CreateGoalBody, CreateGoalResponse, DeleteGoalParams, DeleteGoalResponse,
  ListGoalsResponse, UpdateGoalBody, UpdateGoalParams, UpdateGoalResponse,
  CreateHabitBody, CreateHabitResponse, DeleteHabitParams, DeleteHabitResponse,
  ListHabitsResponse, UpdateHabitBody, UpdateHabitParams, UpdateHabitResponse,
  CheckHabitBody, CheckHabitParams, CheckHabitResponse,
  CreateStudyItemBody, CreateStudyItemResponse, DeleteStudyItemParams, DeleteStudyItemResponse,
  ListStudyItemsResponse, UpdateStudyItemBody, UpdateStudyItemParams, UpdateStudyItemResponse,
} from "@workspace/api-zod";
import { db, goalsTable, habitsTable, studyItemsTable } from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { assertDateOnlyInput } from "../utils/request-validation";

const router: IRouter = Router();
const dateOnly = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = value instanceof Date
    ? value
    : /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00.000Z`)
      : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(`${parsed.toISOString().slice(0, 10)}T00:00:00.000Z`);
};

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function ensureHabitCompletionSchema() {
  const columns = await db.all(sql`PRAGMA table_info(habits)`);
  const hasCompletedDates = columns.some((column) => {
    if (!column || typeof column !== "object") return false;
    return "name" in column && column.name === "completed_dates";
  });
  if (hasCompletedDates) return;

  try {
    await db.run(sql.raw("ALTER TABLE habits ADD COLUMN completed_dates TEXT NOT NULL DEFAULT '[]'"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column name|already exists/i.test(message)) throw error;
  }
}

function normalizeCompletionDates(row: typeof habitsTable.$inferSelect) {
  const storedDates = Array.isArray(row.completedDates)
    ? row.completedDates.filter((value): value is string => /^\d{4}-\d{2}-\d{2}$/.test(value))
    : [];
  if (storedDates.length > 0) return Array.from(new Set(storedDates)).sort();
  return row.lastCompleted ? [dateKey(row.lastCompleted)] : [];
}

function calculateStreak(dates: string[]) {
  if (!dates.length) return 0;
  const completed = new Set(dates);
  let cursor = new Date(`${dates[dates.length - 1]}T00:00:00.000Z`);
  let streak = 0;
  while (completed.has(dateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function serializeHabit(row: typeof habitsTable.$inferSelect) {
  const completedDates = normalizeCompletionDates(row);
  const hasStoredDates = Array.isArray(row.completedDates) && row.completedDates.length > 0;
  const latest = completedDates.at(-1);
  return {
    id: row.id,
    name: row.name,
    frequency: row.frequency,
    streak: hasStoredDates ? calculateStreak(completedDates) : Math.max(row.streak, 0),
    lastCompleted: latest ? new Date(`${latest}T00:00:00.000Z`) : null,
    completedDates: completedDates.map((value) => new Date(`${value}T00:00:00.000Z`)),
    createdAt: row.createdAt,
  };
}

router.get("/goals", async (req, res, next) => {
  try {
    const rows = await db.select().from(goalsTable).where(eq(goalsTable.ownerId, req.userId!)).orderBy(asc(goalsTable.completed), asc(goalsTable.deadline));
    res.json(ListGoalsResponse.parse(rows));
  } catch (error) { next(error); }
});

router.post("/goals", async (req, res, next) => {
  try {
    assertDateOnlyInput(req.body?.deadline, "deadline", { optional: true, nullable: true });
    const input = CreateGoalBody.parse(req.body);
    const [row] = await db.insert(goalsTable).values({ ownerId: req.userId!, title: input.title.trim(), target: input.target ?? 1, deadline: dateOnly(input.deadline) }).returning();
    res.status(201).json(CreateGoalResponse.parse(row));
  } catch (error) { next(error); }
});

router.patch("/goals/:id", async (req, res, next) => {
  try {
    assertDateOnlyInput(req.body?.deadline, "deadline", { optional: true, nullable: true });
    const params = UpdateGoalParams.parse({ id: Number(req.params.id) });
    const input = UpdateGoalBody.parse(req.body);
    const updates: Partial<typeof goalsTable.$inferInsert> = { updatedAt: new Date() };
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.target !== undefined) updates.target = input.target;
    if (input.current !== undefined) updates.current = input.current;
    if (input.deadline !== undefined) updates.deadline = dateOnly(input.deadline);
    if (input.completed !== undefined) updates.completed = input.completed;
    const [row] = await db.update(goalsTable).set(updates).where(and(eq(goalsTable.id, params.id), eq(goalsTable.ownerId, req.userId!))).returning();
    if (!row) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(UpdateGoalResponse.parse(row));
  } catch (error) { next(error); }
});

router.delete("/goals/:id", async (req, res, next) => {
  try {
    const params = DeleteGoalParams.parse({ id: Number(req.params.id) });
    const rows = await db.delete(goalsTable).where(and(eq(goalsTable.id, params.id), eq(goalsTable.ownerId, req.userId!))).returning({ id: goalsTable.id });
    if (!rows.length) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.status(204).json(DeleteGoalResponse.parse(undefined));
  } catch (error) { next(error); }
});

router.get("/habits", async (req, res, next) => {
  try {
    await ensureHabitCompletionSchema();
    const rows = await db.select().from(habitsTable).where(eq(habitsTable.ownerId, req.userId!)).orderBy(asc(habitsTable.createdAt));
    res.json(ListHabitsResponse.parse(rows.map(serializeHabit)));
  } catch (error) { next(error); }
});

router.post("/habits", async (req, res, next) => {
  try {
    await ensureHabitCompletionSchema();
    const input = CreateHabitBody.parse(req.body);
    const [row] = await db.insert(habitsTable).values({
      ownerId: req.userId!,
      name: input.name.trim(),
      frequency: input.frequency ?? "daily",
      streak: 0,
      lastCompleted: null,
      completedDates: [],
    }).returning();
    if (!row) {
      res.status(500).json({ error: "Habit creation failed" });
      return;
    }
    res.status(201).json(CreateHabitResponse.parse(serializeHabit(row)));
  } catch (error) { next(error); }
});

router.patch("/habits/:id", async (req, res, next) => {
  try {
    await ensureHabitCompletionSchema();
    assertDateOnlyInput(req.body?.lastCompleted, "lastCompleted", { optional: true, nullable: true });
    const params = UpdateHabitParams.parse({ id: Number(req.params.id) });
    const input = UpdateHabitBody.parse(req.body);
    const updates: Partial<typeof habitsTable.$inferInsert> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.frequency !== undefined) updates.frequency = input.frequency;
    if (input.streak !== undefined) updates.streak = input.streak;
    if (input.lastCompleted !== undefined) updates.lastCompleted = input.lastCompleted ? dateOnly(input.lastCompleted) : null;
    if (input.lastCompleted === null && input.streak === undefined) updates.streak = 0;
    const [row] = await db.update(habitsTable).set(updates).where(and(eq(habitsTable.id, params.id), eq(habitsTable.ownerId, req.userId!))).returning();
    if (!row) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }
    res.json(UpdateHabitResponse.parse(serializeHabit(row)));
  } catch (error) { next(error); }
});

router.post("/habits/:id/check", async (req, res, next) => {
  try {
    await ensureHabitCompletionSchema();
    assertDateOnlyInput(req.body?.date, "date");
    const params = CheckHabitParams.parse({ id: Number(req.params.id) });
    const input = CheckHabitBody.parse(req.body);
    const selectedDate = dateOnly(input.date);
    if (!selectedDate) {
      res.status(400).json({ error: "Invalid habit date" });
      return;
    }
    const [existing] = await db
      .select()
      .from(habitsTable)
      .where(and(eq(habitsTable.id, params.id), eq(habitsTable.ownerId, req.userId!)))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const selectedKey = dateKey(selectedDate);
    const completedDates = normalizeCompletionDates(existing);
    const nextDates = completedDates.includes(selectedKey)
      ? completedDates.filter((value) => value !== selectedKey)
      : [...completedDates, selectedKey].sort();
    const [row] = await db
      .update(habitsTable)
      .set({
        completedDates: nextDates,
        streak: calculateStreak(nextDates),
        lastCompleted: nextDates.length ? dateOnly(nextDates[nextDates.length - 1]) : null,
      })
      .where(and(eq(habitsTable.id, params.id), eq(habitsTable.ownerId, req.userId!)))
      .returning();
    res.json(CheckHabitResponse.parse(serializeHabit(row)));
  } catch (error) { next(error); }
});

router.delete("/habits/:id", async (req, res, next) => {
  try {
    await ensureHabitCompletionSchema();
    const params = DeleteHabitParams.parse({ id: Number(req.params.id) });
    const rows = await db.delete(habitsTable).where(and(eq(habitsTable.id, params.id), eq(habitsTable.ownerId, req.userId!))).returning({ id: habitsTable.id });
    if (!rows.length) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }
    res.status(204).json(DeleteHabitResponse.parse(undefined));
  } catch (error) { next(error); }
});

router.get("/study-items", async (req, res, next) => {
  try {
    const rows = await db.select().from(studyItemsTable).where(eq(studyItemsTable.ownerId, req.userId!)).orderBy(asc(studyItemsTable.itemDate), asc(studyItemsTable.createdAt));
    res.json(ListStudyItemsResponse.parse(rows));
  } catch (error) { next(error); }
});

router.post("/study-items", async (req, res, next) => {
  try {
    assertDateOnlyInput(req.body?.itemDate, "itemDate", { optional: true, nullable: true });
    const input = CreateStudyItemBody.parse(req.body);
    const [row] = await db.insert(studyItemsTable).values({ ownerId: req.userId!, kind: input.kind, title: input.title.trim(), subject: input.subject?.trim() || null, itemDate: dateOnly(input.itemDate), notes: input.notes?.trim() || null }).returning();
    res.status(201).json(CreateStudyItemResponse.parse(row));
  } catch (error) { next(error); }
});

router.patch("/study-items/:id", async (req, res, next) => {
  try {
    assertDateOnlyInput(req.body?.itemDate, "itemDate", { optional: true, nullable: true });
    const params = UpdateStudyItemParams.parse({ id: Number(req.params.id) });
    const input = UpdateStudyItemBody.parse(req.body);
    const updates: Partial<typeof studyItemsTable.$inferInsert> = {};
    if (input.kind !== undefined) updates.kind = input.kind;
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.subject !== undefined) updates.subject = input.subject?.trim() || null;
    if (input.itemDate !== undefined) updates.itemDate = dateOnly(input.itemDate);
    if (input.completed !== undefined) updates.completed = input.completed;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
    const [row] = await db.update(studyItemsTable).set(updates).where(and(eq(studyItemsTable.id, params.id), eq(studyItemsTable.ownerId, req.userId!))).returning();
    if (!row) {
      res.status(404).json({ error: "Study item not found" });
      return;
    }
    res.json(UpdateStudyItemResponse.parse(row));
  } catch (error) { next(error); }
});

router.delete("/study-items/:id", async (req, res, next) => {
  try {
    const params = DeleteStudyItemParams.parse({ id: Number(req.params.id) });
    const rows = await db.delete(studyItemsTable).where(and(eq(studyItemsTable.id, params.id), eq(studyItemsTable.ownerId, req.userId!))).returning({ id: studyItemsTable.id });
    if (!rows.length) {
      res.status(404).json({ error: "Study item not found" });
      return;
    }
    res.status(204).json(DeleteStudyItemResponse.parse(undefined));
  } catch (error) { next(error); }
});

export default router;