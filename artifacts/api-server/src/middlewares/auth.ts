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
import { isNull } from "drizzle-orm";

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
  await database.transaction(async (tx) => {
    await tx
      .insert(appUsersTable)
      .values({ userId })
      .onConflictDoNothing();
    await tx
      .insert(dashboardPreferencesTable)
      .values({
        ownerId: userId,
        visibleSections: [...defaultDashboardSections],
        sectionOrder: [...defaultDashboardSections],
      })
      .onConflictDoNothing();

    // The primary-key insert acts as the one-time, cross-request claim lock.
    // Only its successful writer can assign previously unowned legacy rows.
    const claimed = await tx
      .insert(appSettingsTable)
      .values({ key: legacyOwnershipSettingKey, value: userId })
      .onConflictDoNothing()
      .returning({ key: appSettingsTable.key });

    if (claimed.length === 0) return;

    await tx.update(tasksTable).set({ ownerId: userId }).where(isNull(tasksTable.ownerId));
    await tx.update(spacesTable).set({ ownerId: userId }).where(isNull(spacesTable.ownerId));
    await tx.update(eventsTable).set({ ownerId: userId }).where(isNull(eventsTable.ownerId));
    await tx.update(spaceLinksTable).set({ ownerId: userId }).where(isNull(spaceLinksTable.ownerId));
  });
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

    const claims = await verifyToken(token, { secretKey });
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await provisionUserAndClaimLegacyData(userId);
    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
}