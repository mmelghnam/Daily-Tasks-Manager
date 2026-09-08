# Daily Tasks Manager

Arabic-first daily workspace for organizing work across four companies and personal development, with persistent task links and completion tracking.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/daily-tasks-manager/` — React + Vite daily workspace UI
- `artifacts/api-server/src/routes/tasks.ts` — task and summary API routes
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/tasks.ts` — PostgreSQL task schema

## Architecture decisions

- Calendar days are stored as PostgreSQL `date` values so task dates do not shift with timezone conversions.
- Links are stored as structured JSON on each task so a task can point to multiple working sheets or files.
- The UI is Arabic-first and RTL while keeping the five work categories as the user's original labels.

## Product

- Browse tasks by day and category
- Add, edit, complete, and delete tasks
- Attach named external links to working sheets and files
- See total, completed, remaining, and per-category progress

## User preferences

- The user manages daily work across INV, BR, Qaff, Wootz, and Self.

## Gotchas

- Re-run API code generation after changing `lib/api-spec/openapi.yaml`.
- Use the managed artifact workflows rather than starting Vite or Express manually.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
