import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function sendHealth(_req: Request, res: Response) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}

// Keep both the service root and the explicit health endpoint probeable.
// The deployment proxy probes the artifact's /api base path before routing
// requests to the nested health endpoint.
router.get("/", sendHealth);
router.get("/healthz", sendHealth);

export default router;
