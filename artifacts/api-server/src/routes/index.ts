import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import spacesRouter from "./spaces";
import eventsRouter from "./events";
import spaceLinksRouter from "./space-links";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(spacesRouter);
router.use(eventsRouter);
router.use(spaceLinksRouter);

export default router;
