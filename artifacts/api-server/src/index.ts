import app from "./app";
import { createServer } from "node:http";
import { createLocalDatabase } from "@workspace/db/local";
import { withDatabase } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const database = await createLocalDatabase();
const server = createServer((request, response) => {
  withDatabase(database, () => app(request, response));
});

server.on("error", (error) => {
  console.error("Error listening on port", error);
  process.exit(1);
});

server.listen(port, () => {
  console.info(`Server listening on port ${port}`);
});
