import { Router, type IRouter } from "express";
import {
  CreateSpaceLinkBody,
  CreateSpaceLinkResponse,
  DeleteSpaceLinkParams,
  ListSpaceLinksQueryParams,
  ListSpaceLinksResponse,
} from "@workspace/api-zod";
import { db, spaceLinksTable, spacesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/space-links", async (req, res, next) => {
  try {
    const params = ListSpaceLinksQueryParams.parse({
      spaceId: req.query.spaceId ? Number(req.query.spaceId) : undefined,
    });
    const query = db.select().from(spaceLinksTable).orderBy(asc(spaceLinksTable.createdAt), asc(spaceLinksTable.id));
    const links = params.spaceId
      ? await query.where(eq(spaceLinksTable.spaceId, params.spaceId))
      : await query;
    res.json(ListSpaceLinksResponse.parse(links));
  } catch (error) {
    next(error);
  }
});

router.post("/space-links", async (req, res, next) => {
  try {
    const input = CreateSpaceLinkBody.parse(req.body);
    const [space] = await db.select({ id: spacesTable.id }).from(spacesTable).where(eq(spacesTable.id, input.spaceId)).limit(1);
    if (!space) {
      res.status(404).json({ error: "Space not found" });
      return;
    }
    const [link] = await db.insert(spaceLinksTable).values({
      spaceId: input.spaceId,
      title: input.title.trim(),
      url: input.url,
    }).returning();
    res.status(201).json(CreateSpaceLinkResponse.parse(link));
  } catch (error) {
    next(error);
  }
});

router.delete("/space-links/:id", async (req, res, next) => {
  try {
    const params = DeleteSpaceLinkParams.parse({ id: Number(req.params.id) });
    const deleted = await db.delete(spaceLinksTable).where(eq(spaceLinksTable.id, params.id)).returning({ id: spaceLinksTable.id });
    if (!deleted.length) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;