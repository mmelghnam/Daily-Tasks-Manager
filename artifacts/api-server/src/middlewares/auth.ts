import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "@clerk/backend";
import {
  appSettingsTable,
  appUsersTable,
  dashboardPreferencesTable,
  defaultDashboardSections,
  db,
  eventsTable,
  legacyOwnershipSettingKey,
  spaceLinksTable,
  spacesTable,
  tasksTable,
} from "@workspace/db";
import { getRuntimeEnv } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { withD1OperationLogging } from "../utils/d1-operation";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function provisionUserAndClaimLegacyData(
  userId: string,
  database: typeof db = db,
) {
  const scope = "auth provisioning";

  // Fast path for returning users. Authentication touches this middleware on
  // every API request, so avoid repeating three idempotent D1 writes after the
  // account has already been provisioned.
  const [existingUser] = await withD1OperationLogging(
    scope,
    "check existing app_user",
    () =>
      database
        .select({ userId: appUsersTable.userId })
        .from(appUsersTable)
        .where(eq(appUsersTable.userId, userId))
        .limit(1),
  );

  if (existingUser) return;

  // Keep these idempotent writes outside an interactive transaction. D1 supports
  // atomic single statements and batch(), but interactive BEGIN/COMMIT handling
  // can fail in a Worker request before the onboarding query is reached.
  await withD1OperationLogging(scope, "insert app_users", () =>
    database
      .insert(appUsersTable)
      .values({ userId })
      .onConflictDoNothing(),
  );
  await withD1OperationLogging(scope, "insert dashboard_preferences", () =>
    database
      .insert(dashboardPreferencesTable)
      .values({
        ownerId: userId,
        visibleSections: [...defaultDashboardSections],
        sectionOrder: [...defaultDashboardSections],
      })
      .onConflictDoNothing(),
  );

  // The primary-key insert acts as the one-time, cross-request claim lock.
  // Only its successful writer can assign previously unowned legacy rows.
  const claimed = await withD1OperationLogging(
    scope,
    "claim legacy ownership in app_settings",
    () =>
      database
        .insert(appSettingsTable)
        .values({ key: legacyOwnershipSettingKey, value: userId })
        .onConflictDoNothing()
        .returning({ key: appSettingsTable.key }),
  );

  if (claimed.length === 0) return;

  await withD1OperationLogging(scope, "claim unowned daily_tasks", () =>
    database.update(tasksTable).set({ ownerId: userId }).where(isNull(tasksTable.ownerId)),
  );
  await withD1OperationLogging(scope, "claim unowned task_spaces", () =>
    database.update(spacesTable).set({ ownerId: userId }).where(isNull(spacesTable.ownerId)),
  );
  await withD1OperationLogging(scope, "claim unowned countdown_events", () =>
    database.update(eventsTable).set({ ownerId: userId }).where(isNull(eventsTable.ownerId)),
  );
  await withD1OperationLogging(scope, "claim unowned space_links", () =>
    database.update(spaceLinksTable).set({ ownerId: userId }).where(isNull(spaceLinksTable.ownerId)),
  );
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.header("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const cookieToken = req.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("__session="))
      ?.slice("__session=".length);
    const token = bearerToken ?? cookieToken;
    const secretKey =
      getRuntimeEnv()?.CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;

    if (!token || !secretKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let claims: Awaited<ReturnType<typeof verifyToken>>;
    try {
      claims = await verifyToken(token, { secretKey });
    } catch {
      // Invalid, expired, malformed, or otherwise unverifiable sessions are an
      // authentication failure, not an application error. Do not leak Clerk
      // verification details to the client or logs.
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = typeof claims.sub === "string" ? claims.sub : null;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await withD1OperationLogging(
      "auth provisioning",
      "complete first-auth account initialization",
      () => provisionUserAndClaimLegacyData(userId),
    );
    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
}
