import { Router, type IRouter } from "express";
import {
  CreateTaskBody,
  CreateTaskResponse,
  CopyTaskBody,
  CopyTaskParams,
  CopyTaskResponse,
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
import { and, asc, desc, eq, gte, lte, max } from "drizzle-orm";

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

function toTaskJson(task: {
  taskDate: Date;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}) {
  return {
    ...task,
    taskDate: toDateOnly(task.taskDate),
    dueDate: task.dueDate ? toDateOnly(task.dueDate) : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function nextRecurringDate(date: string, recurrence: string | null) {
  if (!recurrence) return null;
  const next = new Date(`${date}T12:00:00.000Z`);
  if (recurrence === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (recurrence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else return null;
  return toDateOnly(next);
}

function parseDateRangeQuery(value: unknown) {
  return parseDateQuery(value);
}

router.get("/tasks", async (req, res, next) => {
  try {
    const query = ListTasksQueryParams.parse({
      date: parseDateQuery(req.query.date),
      dateFrom: parseDateRangeQuery(req.query.dateFrom),
      dateTo: parseDateRangeQuery(req.query.dateTo),
    });
    const rows = await db
      .select()
      .from(tasksTable)
      .where(and(
        eq(tasksTable.ownerId, req.userId!),
        query.date ? eq(tasksTable.taskDate, toDateOnly(query.date)) : undefined,
        !query.date && query.dateFrom ? gte(tasksTable.taskDate, toDateOnly(query.dateFrom)) : undefined,
        !query.date && query.dateTo ? lte(tasksTable.taskDate, toDateOnly(query.dateTo)) : undefined,
      ))
      .orderBy(asc(tasksTable.taskDate), asc(tasksTable.category), asc(tasksTable.sortOrder), asc(tasksTable.createdAt), asc(tasksTable.id));

    res.json(ListTasksResponse.parse(rows).map(toTaskJson));
  } catch (error) {
    next(error);
  }
});

router.post("/tasks", async (req, res, next) => {
  try {
    const input = CreateTaskBody.parse(req.body);
    const [lastTask] = await db
      .select({ sortOrder: max(tasksTable.sortOrder) })
      .from(tasksTable)
      .where(and(eq(tasksTable.ownerId, req.userId!), eq(tasksTable.taskDate, toDateOnly(input.taskDate)), eq(tasksTable.category, input.category)));
    const [task] = await db
      .insert(tasksTable)
      .values({
        ownerId: req.userId!,
        taskDate: toDateOnly(input.taskDate),
        category: input.category,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        priority: input.priority ?? "medium",
        recurrence: input.recurrence?.trim() || null,
        dueDate: input.dueDate ? toDateOnly(input.dueDate) : null,
        subtasks: input.subtasks ?? [],
        completed: input.completed ?? false,
        links: input.links ?? [],
        followUps: input.followUps ?? [],
        sortOrder: Number(lastTask?.sortOrder ?? -1) + 1,
      })
      .returning();

    res.status(201).json(toTaskJson(CreateTaskResponse.parse(task)));
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
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.recurrence !== undefined) updates.recurrence = input.recurrence.trim() || null;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate ? toDateOnly(input.dueDate) : null;
    if (input.subtasks !== undefined) updates.subtasks = input.subtasks;
    if (input.completed !== undefined) updates.completed = input.completed;
    if (input.links !== undefined) updates.links = input.links;
    if (input.followUps !== undefined) updates.followUps = input.followUps;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

    const [task] = await db
      .update(tasksTable)
      .set(updates)
      .where(and(eq(tasksTable.id, params.id), eq(tasksTable.ownerId, req.userId!)))
      .returning();

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (input.completed === true && task.recurrence) {
      const nextDate = nextRecurringDate(task.taskDate, task.recurrence);
      if (nextDate) {
        const [existing] = await db
          .select({ id: tasksTable.id })
          .from(tasksTable)
          .where(and(
            eq(tasksTable.ownerId, req.userId!),
            eq(tasksTable.taskDate, nextDate),
            eq(tasksTable.category, task.category),
            eq(tasksTable.title, task.title),
          ))
          .limit(1);

        if (!existing) {
          const [lastTask] = await db
            .select({ sortOrder: max(tasksTable.sortOrder) })
            .from(tasksTable)
            .where(and(eq(tasksTable.ownerId, req.userId!), eq(tasksTable.taskDate, nextDate), eq(tasksTable.category, task.category)));
          await db.insert(tasksTable).values({
            ownerId: req.userId!,
            taskDate: nextDate,
            category: task.category,
            title: task.title,
            notes: task.notes,
            priority: task.priority,
            recurrence: task.recurrence,
            dueDate: task.dueDate ? nextRecurringDate(task.dueDate, task.recurrence) : null,
            subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: false })),
            links: task.links,
            followUps: task.followUps,
            sortOrder: Number(lastTask?.sortOrder ?? -1) + 1,
          });
        }
      }
    }

    res.json(toTaskJson(UpdateTaskResponse.parse(task)));
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:id/copy", async (req, res, next) => {
  try {
    const params = CopyTaskParams.parse({ id: Number(req.params.id) });
    const input = CopyTaskBody.parse(req.body);
    const [source] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, params.id), eq(tasksTable.ownerId, req.userId!)))
      .limit(1);

    if (!source) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const dates = [...new Set(input.dates.map((date) => toDateOnly(date)))];
    const copied = [];
    for (const taskDate of dates) {
      const [existing] = await db
        .select({ id: tasksTable.id })
        .from(tasksTable)
        .where(and(
          eq(tasksTable.ownerId, req.userId!),
          eq(tasksTable.taskDate, taskDate),
          eq(tasksTable.category, source.category),
          eq(tasksTable.title, source.title),
        ))
        .limit(1);

      if (existing) continue;

      const [lastTask] = await db
        .select({ sortOrder: max(tasksTable.sortOrder) })
        .from(tasksTable)
        .where(and(eq(tasksTable.ownerId, req.userId!), eq(tasksTable.taskDate, taskDate), eq(tasksTable.category, source.category)));
      const [copy] = await db
        .insert(tasksTable)
        .values({
          ownerId: req.userId!,
          taskDate,
          category: source.category,
          title: source.title,
          notes: source.notes,
          priority: source.priority,
          recurrence: source.recurrence,
          dueDate: source.dueDate,
          subtasks: source.subtasks.map((subtask) => ({ ...subtask, completed: false })),
          completed: false,
          links: source.links,
          followUps: source.followUps.map((followUp) => ({ ...followUp, completed: false })),
          sortOrder: Number(lastTask?.sortOrder ?? -1) + 1,
        })
        .returning();
      copied.push(copy);
    }

    res.status(201).json(CopyTaskResponse.parse(copied).map(toTaskJson));
  } catch (error) {
    next(error);
  }
});

router.delete("/tasks/:id", async (req, res, next) => {
  try {
    const params = DeleteTaskParams.parse({ id: Number(req.params.id) });
    const deleted = await db
      .delete(tasksTable)
      .where(and(eq(tasksTable.id, params.id), eq(tasksTable.ownerId, req.userId!)))
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
      dateFrom: parseDateRangeQuery(req.query.dateFrom),
      dateTo: parseDateRangeQuery(req.query.dateTo),
    });
    const rows = await db
      .select({
        category: tasksTable.category,
        completed: tasksTable.completed,
      })
      .from(tasksTable)
      .where(and(
        eq(tasksTable.ownerId, req.userId!),
        query.date ? eq(tasksTable.taskDate, toDateOnly(query.date)) : undefined,
        !query.date && query.dateFrom ? gte(tasksTable.taskDate, toDateOnly(query.dateFrom)) : undefined,
        !query.date && query.dateTo ? lte(tasksTable.taskDate, toDateOnly(query.dateTo)) : undefined,
      ));

    const spaces = await db
      .select({ name: spacesTable.name })
      .from(spacesTable)
      .where(eq(spacesTable.ownerId, req.userId!))
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