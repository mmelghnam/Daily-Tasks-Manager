import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { appSettingsTable, db } from "@workspace/db";

const router: IRouter = Router();

type StoredInboxItem = {
  id: number;
  title: string;
  notes: string | null;
  createdAt: string;
};

function parseId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function settingKey(userId: string) {
  return `inbox:${userId}`;
}

function normalizeItems(value: string | undefined): StoredInboxItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      if (
        typeof record.id !== "number" ||
        !Number.isInteger(record.id) ||
        record.id <= 0 ||
        typeof record.title !== "string" ||
        typeof record.createdAt !== "string"
      ) return [];
      return [{
        id: record.id,
        title: record.title,
        notes: typeof record.notes === "string" ? record.notes : null,
        createdAt: record.createdAt,
      }];
    });
  } catch {
    return [];
  }
}

async function readInbox(userId: string) {
  const [row] = await db
    .select({ value: appSettingsTable.value })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, settingKey(userId)))
    .limit(1);
  return normalizeItems(row?.value).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

async function writeInbox(userId: string, items: StoredInboxItem[]) {
  const key = settingKey(userId);
  const value = JSON.stringify(items);
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value },
    });
}

function nextItemId(items: StoredInboxItem[]) {
  const now = Date.now();
  return Math.max(now, ...items.map((item) => item.id + 1));
}

router.get("/inbox", async (req, res, next) => {
  try {
    res.json(await readInbox(req.userId!));
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

    const items = await readInbox(req.userId!);
    const item: StoredInboxItem = {
      id: nextItemId(items),
      title,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };
    await writeInbox(req.userId!, [item, ...items]);
    res.status(201).json(item);
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

    const items = await readInbox(req.userId!);
    const remaining = items.filter((item) => item.id !== id);
    if (remaining.length === items.length) {
      res.status(404).json({ error: "Inbox item not found" });
      return;
    }

    await writeInbox(req.userId!, remaining);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
