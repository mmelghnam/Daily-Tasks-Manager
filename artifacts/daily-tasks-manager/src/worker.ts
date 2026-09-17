import { createServer } from "node:http";
import { handleAsNodeRequest } from "cloudflare:node";
import { env as cloudflareEnv } from "cloudflare:workers";
import app from "../../api-server/src/app";
import {
  createD1Database,
  withRequestContext,
  type RuntimeEnv,
} from "@workspace/db";

type WorkerEnv = RuntimeEnv & {
  DB: Parameters<typeof createD1Database>[0];
  ASSETS: Fetcher;
};

const NODE_SERVER_PORT = 8787;

const server = createServer((request, response) => {
  const runtimeEnv = cloudflareEnv as unknown as WorkerEnv;
  const database = createD1Database(runtimeEnv.DB);
  withRequestContext({ database, env: runtimeEnv }, () => {
    app(request, response);
  });
});

server.listen(NODE_SERVER_PORT);

function isClerkProxyRequest(request: Request) {
  return new URL(request.url).pathname.startsWith("/api/__clerk");
}

async function proxyClerkRequest(request: Request, env: WorkerEnv) {
  const incomingUrl = new URL(request.url);
  const targetPath = incomingUrl.pathname.replace(/^\/api\/__clerk/, "");
  const targetUrl = new URL(`https://frontend-api.clerk.dev${targetPath}`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("Clerk-Secret-Key", env.CLERK_SECRET_KEY ?? "");
  headers.set(
    "Clerk-Proxy-Url",
    `${incomingUrl.origin}/api/__clerk`,
  );

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD"
      ? undefined
      : request.body,
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    if (isClerkProxyRequest(request) && env.CLERK_SECRET_KEY) {
      return proxyClerkRequest(request, env);
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/api")) {
      return handleAsNodeRequest(
        { port: NODE_SERVER_PORT },
        request,
        env,
        ctx,
      );
    }

    return env.ASSETS.fetch(request);
  },
};