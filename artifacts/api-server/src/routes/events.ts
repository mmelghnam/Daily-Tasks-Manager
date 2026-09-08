import { Router, type IRouter } from "express";
import {
  CreateEventBody,
  CreateEventResponse,
  DeleteEventParams,
  ListEventsResponse,
  UpdateEventBody,
  UpdateEventParams,
  UpdateEventResponse,
} from "@workspace/api-zod";
import { db, eventsTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";

const router: IRouter = Router();

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function hasInvalidDateRange(startDate: Date, endDate: Date) {
  return endDate.getTime() < startDate.getTime();
}

router.get("/events", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.ownerId, req.userId!))
      .orderBy(asc(eventsTable.endDate), asc(eventsTable.id));
    res.json(ListEventsResponse.parse(rows));
  } catch (error) {
    next(error);
  }
});

router.post("/events", async (req, res, next) => {
  try {
    const input = CreateEventBody.parse(req.body);
    if (hasInvalidDateRange(input.startDate, input.endDate)) {
      res.status(400).json({ error: "End date must be on or after start date" });
      return;
    }

    const [event] = await db
      .insert(eventsTable)
      .values({
        ownerId: req.userId!,
        title: input.title.trim(),
        startDate: toDateOnly(input.startDate),
        endDate: toDateOnly(input.endDate),
        color: input.color ?? "#d39a2f",
        imageUrl: input.imageUrl?.trim() || null,
      })
      .returning();

    res.status(201).json(CreateEventResponse.parse(event));
  } catch (error) {
    next(error);
  }
});

router.patch("/events/:id", async (req, res, next) => {
  try {
    const params = UpdateEventParams.parse({ id: Number(req.params.id) });
    const input = UpdateEventBody.parse(req.body);
    const updates: Partial<typeof eventsTable.$inferInsert> = {};

    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.startDate !== undefined) updates.startDate = toDateOnly(input.startDate);
    if (input.endDate !== undefined) updates.endDate = toDateOnly(input.endDate);
    if (input.color !== undefined) updates.color = input.color;
    if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl.trim() || null;

    const [event] = await db
      .update(eventsTable)
      .set(updates)
      .where(and(eq(eventsTable.id, params.id), eq(eventsTable.ownerId, req.userId!)))
      .returning();

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.json(UpdateEventResponse.parse(event));
  } catch (error) {
    next(error);
  }
});

router.delete("/events/:id", async (req, res, next) => {
  try {
    const params = DeleteEventParams.parse({ id: Number(req.params.id) });
    const deleted = await db
      .delete(eventsTable)
      .where(and(eq(eventsTable.id, params.id), eq(eventsTable.ownerId, req.userId!)))
      .returning({ id: eventsTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;