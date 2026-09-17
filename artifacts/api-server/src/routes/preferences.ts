import { Router, type IRouter } from "express";
import {
  GetDashboardPreferencesResponse,
  UpdateDashboardPreferencesBody,
  UpdateDashboardPreferencesResponse,
} from "@workspace/api-zod";
import { dashboardPreferencesTable, db, defaultDashboardSections } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const currentDashboardSections = [
  "dateHeader",
  "viewMode",
  "summary",
  "dailyPlan",
  "productivity",
  "focusTools",
  "links",
  "taskMap",
  "tasks",
] as const;

const currentOnlySections = new Set<string>([
  "dateHeader",
  "viewMode",
  "focusTools",
  "tasks",
]);
const allowedSections = new Set<string>([
  ...defaultDashboardSections,
  ...currentDashboardSections,
]);

function normalizeSections(value: unknown) {
  return Array.from(new Set(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && allowedSections.has(item))
      : [],
  ));
}

function usesCurrentLayout(order: string[]) {
  return order.some((section) => currentOnlySections.has(section));
}

function normalizePreferences(row?: { visibleSections: string[]; sectionOrder: string[] }, migrateLegacyVisible = false) {
  const order = normalizeSections(row?.sectionOrder);
  const visible = normalizeSections(row?.visibleSections);
  const defaults = usesCurrentLayout(order)
    ? [...currentDashboardSections]
    : [...defaultDashboardSections];
  const mergedOrder = [...order, ...defaults.filter((section) => !order.includes(section))];
  const isLegacyPreferences = migrateLegacyVisible && Boolean(row && !order.includes("dailyPlan"));
  return {
    visibleSections: row && Array.isArray(row.visibleSections)
      ? (isLegacyPreferences ? Array.from(new Set([...visible, "dailyPlan"])) : visible)
      : [...defaultDashboardSections],
    sectionOrder: row && Array.isArray(row.sectionOrder) ? mergedOrder : [...defaultDashboardSections],
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
    const sectionOrder = input.sectionOrder === undefined ? current.sectionOrder : normalizeSections(input.sectionOrder);
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
