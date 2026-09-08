import { Router, type IRouter } from "express";
import { ListNotificationsResponse } from "@workspace/api-zod";
import { broadcastNotificationsTable, db } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notifications", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: broadcastNotificationsTable.id,
        title: broadcastNotificationsTable.title,
        body: broadcastNotificationsTable.body,
        createdAt: broadcastNotificationsTable.createdAt,
      })
      .from(broadcastNotificationsTable)
      .orderBy(desc(broadcastNotificationsTable.createdAt))
      .limit(10);
    res.json(ListNotificationsResponse.parse(rows));
  } catch (error) {
    next(error);
  }
});

export default router;