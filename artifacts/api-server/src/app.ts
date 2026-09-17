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

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  logOperationError("API server", `${req.method} ${req.path}`, error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

export default app;
