import { Router, type IRouter } from "express";
import {
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  GetTaskSummaryQueryParams,
  GetTaskSummaryResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { db, tasksTable } from "@workspace/db";
import { spacesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

const router: IRouter = Router();

function parseDateQuery(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

router.get("/tasks", async (req, res, next) => {
  try {
    const query = ListTasksQueryParams.parse({
      date: parseDateQuery(req.query.date),
    });
    const rows = await db
      .select()
      .from(tasksTable)
      .where(query.date ? eq(tasksTable.taskDate, toDateOnly(query.date)) : undefined)
      .orderBy(asc(tasksTable.taskDate), asc(tasksTable.category), asc(tasksTable.id));

    res.json(ListTasksResponse.parse(rows));
  } catch (error) {
    next(error);
  }
});

router.post("/tasks", async (req, res, next) => {
  try {
    const input = CreateTaskBody.parse(req.body);
    const [task] = await db
      .insert(tasksTable)
      .values({
        taskDate: toDateOnly(input.taskDate),
        category: input.category,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        completed: input.completed ?? false,
        links: input.links ?? [],
        followUps: input.followUps ?? [],
      })
      .returning();

    res.status(201).json(CreateTaskResponse.parse(task));
  } catch (error) {
    next(error);
  }
});

router.patch("/tasks/:id", async (req, res, next) => {
  try {
    const params = UpdateTaskParams.parse({ id: Number(req.params.id) });
    const input = UpdateTaskBody.parse(req.body);
    const updates: Partial<typeof tasksTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.taskDate !== undefined) updates.taskDate = toDateOnly(input.taskDate);
    if (input.category !== undefined) updates.category = input.category;
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.notes !== undefined) updates.notes = input.notes.trim() || null;
    if (input.completed !== undefined) updates.completed = input.completed;
    if (input.links !== undefined) updates.links = input.links;
    if (input.followUps !== undefined) updates.followUps = input.followUps;

    const [task] = await db
      .update(tasksTable)
      .set(updates)
      .where(eq(tasksTable.id, params.id))
      .returning();

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(UpdateTaskResponse.parse(task));
  } catch (error) {
    next(error);
  }
});

router.delete("/tasks/:id", async (req, res, next) => {
  try {
    const params = DeleteTaskParams.parse({ id: Number(req.params.id) });
    const deleted = await db
      .delete(tasksTable)
      .where(eq(tasksTable.id, params.id))
      .returning({ id: tasksTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/summary", async (req, res, next) => {
  try {
    const query = GetTaskSummaryQueryParams.parse({
      date: parseDateQuery(req.query.date),
    });
    const rows = await db
      .select({
        category: tasksTable.category,
        completed: tasksTable.completed,
      })
      .from(tasksTable)
      .where(query.date ? eq(tasksTable.taskDate, toDateOnly(query.date)) : undefined);

    const spaces = await db
      .select({ name: spacesTable.name })
      .from(spacesTable)
      .orderBy(asc(spacesTable.createdAt), asc(spacesTable.id));
    const byCategory = Object.fromEntries(spaces.map((space) => [space.name, 0]));
    let completed = 0;
    for (const row of rows) {
      if (!(row.category in byCategory)) byCategory[row.category] = 0;
      byCategory[row.category] += 1;
      if (row.completed) completed += 1;
    }

    res.json(
      GetTaskSummaryResponse.parse({
        total: rows.length,
        completed,
        remaining: rows.length - completed,
        byCategory,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;