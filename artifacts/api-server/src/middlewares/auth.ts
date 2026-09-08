import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  appSettingsTable,
  appUsersTable,
  db,
  eventsTable,
  legacyOwnershipSettingKey,
  spaceLinksTable,
  spacesTable,
  tasksTable,
} from "@workspace/db";
import { isNull } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

async function provisionUserAndClaimLegacyData(userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .insert(appUsersTable)
      .values({ userId })
      .onConflictDoNothing();

    // The primary-key insert acts as the one-time, cross-request claim lock.
    // Only its successful writer can assign previously unowned legacy rows.
    const claimed = await tx
      .insert(appSettingsTable)
      .values({ key: legacyOwnershipSettingKey, value: userId })
      .onConflictDoNothing()
      .returning({ key: appSettingsTable.key });

    if (claimed.length === 0) return;

    await Promise.all([
      tx.update(tasksTable).set({ ownerId: userId }).where(isNull(tasksTable.ownerId)),
      tx.update(spacesTable).set({ ownerId: userId }).where(isNull(spacesTable.ownerId)),
      tx.update(eventsTable).set({ ownerId: userId }).where(isNull(eventsTable.ownerId)),
      tx.update(spaceLinksTable).set({ ownerId: userId }).where(isNull(spaceLinksTable.ownerId)),
    ]);
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    const claimedUserId = auth?.sessionClaims?.userId;
    const userId = auth?.userId ?? (typeof claimedUserId === "string" ? claimedUserId : null);
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