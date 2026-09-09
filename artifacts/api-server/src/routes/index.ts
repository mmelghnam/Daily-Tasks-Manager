import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import spacesRouter from "./spaces";
import eventsRouter from "./events";
import spaceLinksRouter from "./space-links";
import onboardingRouter from "./onboarding";
import productivityRouter from "./productivity";
import { requireAuth } from "../middlewares/auth";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import preferencesRouter from "./preferences";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(preferencesRouter);
router.use(onboardingRouter);
router.use(productivityRouter);
router.use(tasksRouter);
router.use(spacesRouter);
router.use(eventsRouter);
router.use(spaceLinksRouter);

export default router;
