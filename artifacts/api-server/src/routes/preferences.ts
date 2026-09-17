import { Router, type IRouter } from "express";
import {
  GetDashboardPreferencesResponse,
  UpdateDashboardPreferencesBody,
  UpdateDashboardPreferencesResponse,
} from "@workspace/api-zod";
import { dashboardPreferencesTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const currentDashboardSections = [
  "summary",
  "productivity",
  "taskMap",
  "tasks",
] as const;

const legacySections = new Set<string>([
  "dateHeader", "viewMode", "dailyPlan", "focusTools", "links",
  "events", "notifications", "summary", "productivity", "taskMap", "tasks",
]);
const currentSections = new Set<string>(currentDashboardSections);

function normalizeCurrent(value: unknown) {
  return Array.from(new Set(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && currentSections.has(item))
      : [],
  ));
}

function normalizePreferences(row?: { visibleSections: string[]; sectionOrder: string[] }) {
  const savedOrder = Array.isArray(row?.sectionOrder)
    ? row!.sectionOrder.filter((item): item is string => typeof item === "string" && legacySections.has(item) && currentSections.has(item))
    : [];
  const order = [...savedOrder, ...currentDashboardSections.filter((section) => !savedOrder.includes(section))];
  const visible = row && Array.isArray(row.visibleSections)
    ? normalizeCurrent(row.visibleSections)
    : [...currentDashboardSections];
  return {
    visibleSections: visible,
    sectionOrder: order,
  };
}

router.get("/preferences/dashboard", async (req, res, next) => {
  try {
    const [row] = await db
      .select({ visibleSections: dashboardPreferencesTable.visibleSections, sectionOrder: dashboardPreferencesTable.sectionOrder })
      .from(dashboardPreferencesTable)
      .where(eq(dashboardPreferencesTable.ownerId, req.userId!))
      .limit(1);
    res.json(GetDashboardPreferencesResponse.parse(normalizePreferences(row)));
  } catch (error) {
    next(error);
  }
});

router.patch("/preferences/dashboard", async (req, res, next) => {
  try {
    const input = UpdateDashboardPreferencesBody.parse(req.body);
    const [existing] = await db
      .select({ visibleSections: dashboardPreferencesTable.visibleSections, sectionOrder: dashboardPreferencesTable.sectionOrder })
      .from(dashboardPreferencesTable)
      .where(eq(dashboardPreferencesTable.ownerId, req.userId!))
      .limit(1);
    const current = normalizePreferences(existing);
    const visibleSections = input.visibleSections === undefined ? current.visibleSections : normalizeCurrent(input.visibleSections);
    const requestedOrder = input.sectionOrder === undefined ? current.sectionOrder : normalizeCurrent(input.sectionOrder);
    const sectionOrder = [...requestedOrder, ...currentDashboardSections.filter((section) => !requestedOrder.includes(section))];
    const [row] = await db
      .insert(dashboardPreferencesTable)
      .values({ ownerId: req.userId!, visibleSections, sectionOrder, updatedAt: new Date() })
      .onConflictDoUpdate({ target: dashboardPreferencesTable.ownerId, set: { visibleSections, sectionOrder, updatedAt: new Date() } })
      .returning({ visibleSections: dashboardPreferencesTable.visibleSections, sectionOrder: dashboardPreferencesTable.sectionOrder });
    res.json(UpdateDashboardPreferencesResponse.parse(normalizePreferences(row)));
  } catch (error) {
    next(error);
  }
});

export default router;
