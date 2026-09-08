import { Router, type IRouter } from "express";
import {
  CreateSpaceBody,
  CreateSpaceResponse,
  DeleteSpaceParams,
  ListSpacesResponse,
} from "@workspace/api-zod";
import { db, spacesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/spaces", async (_req, res, next) => {
  try {
    const spaces = await db
      .select()
      .from(spacesTable)
      .orderBy(asc(spacesTable.createdAt), asc(spacesTable.id));
    res.json(ListSpacesResponse.parse(spaces));
  } catch (error) {
    next(error);
  }
});

router.post("/spaces", async (req, res, next) => {
  try {
    const input = CreateSpaceBody.parse(req.body);
    const name = input.name.trim();
    if (!name) {
      res.status(400).json({ error: "Space name is required" });
      return;
    }

    const existing = await db
      .select({ id: spacesTable.id })
      .from(spacesTable)
      .where(eq(spacesTable.name, name))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "A space with this name already exists" });
      return;
    }

    const [space] = await db
      .insert(spacesTable)
      .values({
        name,
        color: input.color?.trim() || "#2e8d77",
        description: input.description?.trim() || null,
      })
      .returning();

    res.status(201).json(CreateSpaceResponse.parse(space));
  } catch (error: unknown) {
    next(error);
  }
});

router.delete("/spaces/:id", async (req, res, next) => {
  try {
    const params = DeleteSpaceParams.parse({ id: Number(req.params.id) });
    const deleted = await db
      .delete(spacesTable)
      .where(eq(spacesTable.id, params.id))
      .returning({ id: spacesTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Space not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;