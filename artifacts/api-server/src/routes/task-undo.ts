import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { appSettingsTable, db, tasksTable } from "@workspace/db";

const router: IRouter = Router();
const UNDO_TTL_MS = 5 * 60 * 1000;

function parseId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function undoKey(userId: string) {
  return `last_deleted_task:${userId}`;
}

function dateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

type DeletedTaskSnapshot = {
  deletedAt: number;
  task: {
    id: number;
    taskDate: string;
    category: string;
    title: string;
    notes: string | null;
    priority: string;
    sortOrder: number;
    startTime: string | null;
    durationMinutes: number | null;
    recurrence: string | null;
    dueDate: string | null;
    subtasks: typeof tasksTable.$inferSelect.subtasks;
    completed: boolean;
    links: typeof tasksTable.$inferSelect.links;
    followUps: typeof tasksTable.$inferSelect.followUps;
    createdAt: string;
    updatedAt: string;
  };
};

async function saveSnapshot(userId: string, task: typeof tasksTable.$inferSelect) {
  const snapshot: DeletedTaskSnapshot = {
    deletedAt: Date.now(),
    task: {
      id: task.id,
      taskDate: dateOnly(task.taskDate)!,
      category: task.category,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      sortOrder: task.sortOrder,
      startTime: task.startTime,
      durationMinutes: task.durationMinutes,
      recurrence: task.recurrence,
      dueDate: dateOnly(task.dueDate),
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      completed: task.completed,
      links: Array.isArray(task.links) ? task.links : [],
      followUps: Array.isArray(task.followUps) ? task.followUps : [],
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    },
  };
  const key = undoKey(userId);
  const value = JSON.stringify(snapshot);
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value } });
}

function parseSnapshot(value: string | undefined): DeletedTaskSnapshot | null {
  if (!value) return null;
  try {
    const snapshot = JSON.parse(value) as DeletedTaskSnapshot;
    if (
      !snapshot ||
      typeof snapshot.deletedAt !== "number" ||
      !snapshot.task ||
      !Number.isInteger(snapshot.task.id) ||
      typeof snapshot.task.taskDate !== "string" ||
      typeof snapshot.task.title !== "string" ||
      typeof snapshot.task.category !== "string"
    ) return null;
    return snapshot;
  } catch {
    return null;
  }
}

// Capture only the last successfully requested account-owned task before the
// existing DELETE handler removes it. The actual deletion still happens in
// routes/tasks.ts, so this middleware does not change normal delete semantics.
router.use("/tasks/:id", async (req, _res, next) => {
  if (req.method !== "DELETE") {
    next();
    return;
  }
  try {
    const id = parseId(req.params.id);
    if (!id) {
      next();
      return;
    }
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.ownerId, req.userId!)))
      .limit(1);
    if (task) await saveSnapshot(req.userId!, task);
    next();
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:id/restore", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    const key = undoKey(req.userId!);
    const [row] = await db
      .select({ value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, key))
      .limit(1);
    const snapshot = parseSnapshot(row?.value);

    if (!snapshot || snapshot.task.id !== id) {
      res.status(404).json({ error: "No restorable task found" });
      return;
    }
    if (Date.now() - snapshot.deletedAt > UNDO_TTL_MS) {
      await db.delete(appSettingsTable).where(eq(appSettingsTable.key, key));
      res.status(410).json({ error: "Undo window expired" });
      return;
    }

    const [existing] = await db
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.ownerId, req.userId!)))
      .limit(1);
    if (existing) {
      await db.delete(appSettingsTable).where(eq(appSettingsTable.key, key));
      res.json({ restored: true, id });
      return;
    }

    const task = snapshot.task;
    await db.insert(tasksTable).values({
      id: task.id,
      ownerId: req.userId!,
      taskDate: new Date(`${task.taskDate}T00:00:00.000Z`),
      category: task.category,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      sortOrder: task.sortOrder,
      startTime: task.startTime,
      durationMinutes: task.durationMinutes,
      recurrence: task.recurrence,
      dueDate: task.dueDate ? new Date(`${task.dueDate}T00:00:00.000Z`) : null,
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      completed: task.completed,
      links: Array.isArray(task.links) ? task.links : [],
      followUps: Array.isArray(task.followUps) ? task.followUps : [],
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
    });
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, key));
    res.json({ restored: true, id });
  } catch (error) {
    next(error);
  }
});

export default router;
