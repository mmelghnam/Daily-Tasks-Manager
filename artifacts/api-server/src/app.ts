import express, {
  type ErrorRequestHandler,
  type Express,
} from "express";
import cors from "cors";
import router from "./routes";
import { logOperationError } from "./utils/d1-operation";

const app: Express = express();

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

type ValidationError = {
  name: "ZodError";
  issues: Array<{ path: PropertyKey[]; message: string; code: string }>;
};

type HttpError = {
  statusCode: number;
  message: string;
};

function isValidationError(error: unknown): error is ValidationError {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { name?: unknown }).name === "ZodError" &&
      Array.isArray((error as { issues?: unknown }).issues),
  );
}

function isHttpError(error: unknown): error is HttpError {
  return Boolean(
    error &&
      typeof error === "object" &&
      typeof (error as { statusCode?: unknown }).statusCode === "number" &&
      typeof (error as { message?: unknown }).message === "string",
  );
}

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  logOperationError("API server", `${req.method} ${req.path}`, error);

  if (res.headersSent) {
    next(error);
    return;
  }

  if (isValidationError(error)) {
    res.status(400).json({
      error: "Invalid request",
      issues: error.issues.map(({ path, message, code }) => ({ path, message, code })),
    });
    return;
  }

  if (isHttpError(error)) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

export default app;
