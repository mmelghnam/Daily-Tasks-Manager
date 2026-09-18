import { Router, type IRouter } from "express";
import {
  GetDashboardPreferencesResponse,
  UpdateDashboardPreferencesBody,
  UpdateDashboardPreferencesResponse,
} from "@workspace/api-zod";
import { dashboardPreferencesTable, db, defaultDashboardSections } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const allowedSections = new Set<string>(defaultDashboardSections);

function normalizeSections(value: unknown) {
  return Array.from(new Set(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && allowedSections.has(item))
      : [],
  ));
}

function normalizePreferences(
  row?: { visibleSections: string[]; sectionOrder: string[] },
  migrateLegacyVisible = false,
) {
  const order = normalizeSections(row?.sectionOrder);
  const visible = normalizeSections(row?.visibleSections);
  const mergedOrder = [...order, ...defaultDashboardSections.filter((section) => !order.includes(section))];
  const isLegacyPreferences = migrateLegacyVisible
    && Boolean(row)
    && !order.includes("monthlyRhythm")
    && !order.includes("monthlyGoals");

  const migratedVisible = isLegacyPreferences
    ? Array.from(new Set([...visible, "monthlyRhythm", "monthlyGoals"]))
    : visible;

  return {
    visibleSections: row && Array.isArray(row.visibleSections)
      ? migratedVisible
      : [...defaultDashboardSections],
    sectionOrder: row && Array.isArray(row.sectionOrder)
      ? mergedOrder
      : [...defaultDashboardSections],
  };
}

router.get("/preferences/dashboard", async (req, res, next) => {
  try {
    const [row] = await db
      .select({
        visibleSections: dashboardPreferencesTable.visibleSections,
        sectionOrder: dashboardPreferencesTable.sectionOrder,
      })
      .from(dashboardPreferencesTable)
      .where(eq(dashboardPreferencesTable.ownerId, req.userId!))
      .limit(1);
    res.json(GetDashboardPreferencesResponse.parse(normalizePreferences(row, true)));
  } catch (error) {
    next(error);
  }
});

router.patch("/preferences/dashboard", async (req, res, next) => {
  try {
    const input = UpdateDashboardPreferencesBody.parse(req.body);
    const [existing] = await db
      .select({
        visibleSections: dashboardPreferencesTable.visibleSections,
        sectionOrder: dashboardPreferencesTable.sectionOrder,
      })
      .from(dashboardPreferencesTable)
      .where(eq(dashboardPreferencesTable.ownerId, req.userId!))
      .limit(1);
    const current = normalizePreferences(existing, true);
    const visibleSections = input.visibleSections === undefined ? current.visibleSections : normalizeSections(input.visibleSections);
    const requestedOrder = input.sectionOrder === undefined ? current.sectionOrder : normalizeSections(input.sectionOrder);
    const sectionOrder = [...requestedOrder, ...defaultDashboardSections.filter((section) => !requestedOrder.includes(section))];

    const [row] = await db
      .insert(dashboardPreferencesTable)
      .values({
        ownerId: req.userId!,
        visibleSections,
        sectionOrder,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: dashboardPreferencesTable.ownerId,
        set: {
          visibleSections,
          sectionOrder,
          updatedAt: new Date(),
        },
      })
      .returning({
        visibleSections: dashboardPreferencesTable.visibleSections,
        sectionOrder: dashboardPreferencesTable.sectionOrder,
      });
    res.json(UpdateDashboardPreferencesResponse.parse(normalizePreferences(row)));
  } catch (error) {
    next(error);
  }
});

export default router;
