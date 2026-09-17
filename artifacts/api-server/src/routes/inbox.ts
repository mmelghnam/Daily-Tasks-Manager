import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, inboxItemsTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/inbox", async (req, res, next) => {
  try {
    const items = await db
      .select()
      .from(inboxItemsTable)
      .where(eq(inboxItemsTable.ownerId, req.userId!))
      .orderBy(desc(inboxItemsTable.createdAt), desc(inboxItemsTable.id));

    res.json(items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (error) {
    next(error);
  }
});

router.post("/inbox", async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";

    if (!title || title.length > 240) {
      res.status(400).json({ error: "title must be between 1 and 240 characters" });
      return;
    }
    if (notes.length > 2000) {
      res.status(400).json({ error: "notes must be at most 2000 characters" });
      return;
    }

    const [item] = await db
      .insert(inboxItemsTable)
      .values({
        ownerId: req.userId!,
        title,
        notes: notes || null,
      })
      .returning();

    res.status(201).json({
      ...item,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/inbox/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid inbox item id" });
      return;
    }

    const [deleted] = await db
      .delete(inboxItemsTable)
      .where(and(eq(inboxItemsTable.id, id), eq(inboxItemsTable.ownerId, req.userId!)))
      .returning({ id: inboxItemsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Inbox item not found" });
      return;
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
