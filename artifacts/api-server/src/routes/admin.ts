import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateAdminNotificationBody,
  CreateAdminNotificationResponse,
  GetAdminAccessResponse,
  GetAdminStatsResponse,
} from "@workspace/api-zod";
import {
  appUsersTable,
  broadcastNotificationsTable,
  db,
  goalsTable,
  habitsTable,
  spacesTable,
  tasksTable,
} from "@workspace/db";
import { and, asc, count, eq, gte, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

async function isPrimaryAdmin(userId: string) {
  const configuredAdminId = process.env.ADMIN_USER_ID?.trim();
  if (configuredAdminId) return configuredAdminId === userId;

  const [firstUser] = await db
    .select({ userId: appUsersTable.userId })
    .from(appUsersTable)
    .orderBy(asc(appUsersTable.createdAt), asc(appUsersTable.userId))
    .limit(1);
  return firstUser?.userId === userId;
}

async function requireAdmin(req: Request, res: Response) {
  if (!req.userId || !(await isPrimaryAdmin(req.userId))) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/admin/access", async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(GetAdminAccessResponse.parse({ isAdmin: await isPrimaryAdmin(req.userId!) }));
  } catch (error) {
    next(error);
  }
});

router.get("/admin/stats", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [[users], [tasks], [completedTasks], [spaces], [goals], [habits], activeUsers, usageTypes] = await Promise.all([
      db.select({ value: count() }).from(appUsersTable),
      db.select({ value: count() }).from(tasksTable),
      db.select({ value: count() }).from(tasksTable).where(eq(tasksTable.completed, true)),
      db.select({ value: count() }).from(spacesTable),
      db.select({ value: count() }).from(goalsTable),
      db.select({ value: count() }).from(habitsTable),
      db.select({ userId: tasksTable.ownerId }).from(tasksTable).where(and(gte(tasksTable.createdAt, since), isNotNull(tasksTable.ownerId))).groupBy(tasksTable.ownerId),
      db.select({ usageType: appUsersTable.usageType, value: count() }).from(appUsersTable).groupBy(appUsersTable.usageType),
    ]);

    const userCount = Number(users?.value ?? 0);
    const taskCount = Number(tasks?.value ?? 0);
    const completedCount = Number(completedTasks?.value ?? 0);
    const byUsageType = Object.fromEntries(
      usageTypes.filter((row) => row.usageType).map((row) => [row.usageType as string, Number(row.value)]),
    );

    res.json(GetAdminStatsResponse.parse({
      users: userCount,
      tasks: taskCount,
      completedTasks: completedCount,
      spaces: Number(spaces?.value ?? 0),
      goals: Number(goals?.value ?? 0),
      habits: Number(habits?.value ?? 0),
      activeUsers30d: activeUsers.length,
      completionRate: taskCount ? Math.round((completedCount / taskCount) * 100) : 0,
      usageTypes: byUsageType,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/admin/notifications", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const input = CreateAdminNotificationBody.parse(req.body);
    const [notification] = await db
      .insert(broadcastNotificationsTable)
      .values({
        id: randomUUID(),
        title: input.title.trim(),
        body: input.body.trim(),
        createdBy: req.userId!,
      })
      .returning({
        id: broadcastNotificationsTable.id,
        title: broadcastNotificationsTable.title,
        body: broadcastNotificationsTable.body,
        createdAt: broadcastNotificationsTable.createdAt,
      });
    res.status(201).json(CreateAdminNotificationResponse.parse(notification));
  } catch (error) {
    next(error);
  }
});

export default router;