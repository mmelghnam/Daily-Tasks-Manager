import { Router, type IRouter } from "express";
import {
  CreateGoalBody, CreateGoalResponse, DeleteGoalParams, DeleteGoalResponse,
  ListGoalsResponse, UpdateGoalBody, UpdateGoalParams, UpdateGoalResponse,
  CreateHabitBody, CreateHabitResponse, DeleteHabitParams, DeleteHabitResponse,
  ListHabitsResponse, UpdateHabitBody, UpdateHabitParams, UpdateHabitResponse,
  CreateStudyItemBody, CreateStudyItemResponse, DeleteStudyItemParams, DeleteStudyItemResponse,
  ListStudyItemsResponse, UpdateStudyItemBody, UpdateStudyItemParams, UpdateStudyItemResponse,
} from "@workspace/api-zod";
import { db, goalsTable, habitsTable, studyItemsTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";

const router: IRouter = Router();
const dateOnly = (value: string | Date | null | undefined) => value ? new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) : null;

router.get("/goals", async (req, res, next) => {
  try {
    const rows = await db.select().from(goalsTable).where(eq(goalsTable.ownerId, req.userId!)).orderBy(asc(goalsTable.completed), asc(goalsTable.deadline));
    res.json(ListGoalsResponse.parse(rows));
  } catch (error) { next(error); }
});

router.post("/goals", async (req, res, next) => {
  try {
    const input = CreateGoalBody.parse(req.body);
    const [row] = await db.insert(goalsTable).values({ ownerId: req.userId!, title: input.title.trim(), target: input.target ?? 1, deadline: dateOnly(input.deadline) }).returning();
    res.status(201).json(CreateGoalResponse.parse(row));
  } catch (error) { next(error); }
});

router.patch("/goals/:id", async (req, res, next) => {
  try {
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
    const rows = await db.select().from(habitsTable).where(eq(habitsTable.ownerId, req.userId!)).orderBy(asc(habitsTable.createdAt));
    res.json(ListHabitsResponse.parse(rows));
  } catch (error) { next(error); }
});

router.post("/habits", async (req, res, next) => {
  try {
    const input = CreateHabitBody.parse(req.body);
    const [row] = await db.insert(habitsTable).values({ ownerId: req.userId!, name: input.name.trim(), frequency: input.frequency ?? "daily" }).returning();
    res.status(201).json(CreateHabitResponse.parse(row));
  } catch (error) { next(error); }
});

router.patch("/habits/:id", async (req, res, next) => {
  try {
    const params = UpdateHabitParams.parse({ id: Number(req.params.id) });
    const input = UpdateHabitBody.parse(req.body);
    const updates: Partial<typeof habitsTable.$inferInsert> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.frequency !== undefined) updates.frequency = input.frequency;
    if (input.streak !== undefined) updates.streak = input.streak;
    if (input.lastCompleted !== undefined) updates.lastCompleted = input.lastCompleted ? dateOnly(input.lastCompleted) : null;
    const [row] = await db.update(habitsTable).set(updates).where(and(eq(habitsTable.id, params.id), eq(habitsTable.ownerId, req.userId!))).returning();
    if (!row) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }
    res.json(UpdateHabitResponse.parse(row));
  } catch (error) { next(error); }
});

router.delete("/habits/:id", async (req, res, next) => {
  try {
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
    const input = CreateStudyItemBody.parse(req.body);
    const [row] = await db.insert(studyItemsTable).values({ ownerId: req.userId!, kind: input.kind, title: input.title.trim(), subject: input.subject?.trim() || null, itemDate: dateOnly(input.itemDate), notes: input.notes?.trim() || null }).returning();
    res.status(201).json(CreateStudyItemResponse.parse(row));
  } catch (error) { next(error); }
});

router.patch("/study-items/:id", async (req, res, next) => {
  try {
    const params = UpdateStudyItemParams.parse({ id: Number(req.params.id) });
    const input = UpdateStudyItemBody.parse(req.body);
    const updates: Partial<typeof studyItemsTable.$inferInsert> = {};
    if (input.kind !== undefined) updates.kind = input.kind;
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.subject !== undefined) updates.subject = input.subject.trim() || null;
    if (input.itemDate !== undefined) updates.itemDate = dateOnly(input.itemDate);
    if (input.completed !== undefined) updates.completed = input.completed;
    if (input.notes !== undefined) updates.notes = input.notes.trim() || null;
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