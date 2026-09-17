import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppDatabase, withRequestContext } from "@workspace/db";
import { createLocalDatabase } from "@workspace/db/local";
import { provisionUserAndClaimLegacyData } from "./middlewares/auth";
import app from "./app";
import healthRouter from "./routes/health";
import notificationsRouter from "./routes/notifications";
import adminRouter from "./routes/admin";
import preferencesRouter from "./routes/preferences";
import onboardingRouter from "./routes/onboarding";
import productivityRouter from "./routes/productivity";
import tasksRouter from "./routes/tasks";
import spacesRouter from "./routes/spaces";
import eventsRouter from "./routes/events";
import spaceLinksRouter from "./routes/space-links";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
type ApiResponse = { status: number; body: Json | null };

const users = {
  student: "hardening-student",
  employee: "hardening-employee",
  freelancer: "hardening-freelancer",
  personal: "hardening-personal",
} as const;

let testDb: AppDatabase;
let routeServer: Server;
let authServer: Server;
let routeBaseUrl: string;
let authBaseUrl: string;

function createRouteApi() {
  const api = express();
  api.use(express.json());
  api.use((req, _res, next) => {
    req.userId = req.header("x-test-user") ?? users.student;
    next();
  });
  api.use("/api", healthRouter);
  api.use("/api", notificationsRouter);
  api.use("/api", adminRouter);
  api.use("/api", preferencesRouter);
  api.use("/api", onboardingRouter);
  api.use("/api", productivityRouter);
  api.use("/api", tasksRouter);
  api.use("/api", spacesRouter);
  api.use("/api", eventsRouter);
  api.use("/api", spaceLinksRouter);
  api.use((error: any, _req: any, res: any, _next: any) => {
    const status = typeof error?.statusCode === "number" ? error.statusCode : 500;
    res.status(status).json({ error: error?.message ?? "Internal server error" });
  });
  return api;
}

function listen(handler: (request: any, response: any) => void) {
  const server = createServer(handler);
  return new Promise<{ server: Server; baseUrl: string }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not bind");
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function request(
  baseUrl: string,
  userId: string | undefined,
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse> {
  const headers = new Headers(init.headers);
  if (userId) headers.set("x-test-user", userId);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl}/api${path}`, { ...init, headers });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) as Json : null,
  };
}

function json(value: Json): string {
  return JSON.stringify(value);
}

beforeAll(async () => {
  testDb = await createLocalDatabase(
    `file:.data/api-hardening-${process.pid}-${Date.now()}.sqlite`,
  );
  for (const userId of Object.values(users)) {
    await provisionUserAndClaimLegacyData(userId, testDb);
  }

  const routeApi = createRouteApi();
  const route = await listen((request, response) => {
    withRequestContext({ database: testDb, env: { ADMIN_USER_ID: users.student } }, () => {
      routeApi(request, response);
    });
  });
  routeServer = route.server;
  routeBaseUrl = route.baseUrl;

  const auth = await listen((request, response) => {
    withRequestContext({ database: testDb, env: {} }, () => app(request, response));
  });
  authServer = auth.server;
  authBaseUrl = auth.baseUrl;
});

afterAll(async () => {
  await Promise.all([
    new Promise<void>((resolve, reject) => routeServer.close((error) => error ? reject(error) : resolve())),
    new Promise<void>((resolve, reject) => authServer.close((error) => error ? reject(error) : resolve())),
  ]);
});

describe("production API hardening", () => {
  it("keeps health public and protected resources authenticated", async () => {
    expect((await request(routeBaseUrl, undefined, "/")).status).toBe(200);
    expect((await request(routeBaseUrl, undefined, "/healthz")).body).toEqual({ status: "ok" });

    const response = await fetch(`${authBaseUrl}/api/tasks`);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("onboards all usage types and retries without duplicates", async () => {
    const cases = [
      ["student", users.student, "الدراسة"],
      ["employee", users.employee, "العمل"],
      ["freelancer", users.freelancer, "العملاء"],
      ["personal", users.personal, "أولوياتي"],
    ] as const;

    for (const [usageType, userId, firstSpace] of cases) {
      const complete = await request(routeBaseUrl, userId, "/onboarding", {
        method: "POST",
        body: json({ usageType, taskDate: "2026-09-17" }),
      });
      expect(complete.status).toBe(200);
      expect(complete.body).toMatchObject({ completed: true, usageType });

      const retry = await request(routeBaseUrl, userId, "/onboarding", {
        method: "POST",
        body: json({ usageType, taskDate: "2026-09-17" }),
      });
      expect(retry.status).toBe(200);
      expect(retry.body).toMatchObject({ completed: true, usageType });

      const spaces = await request(routeBaseUrl, userId, "/spaces");
      expect(spaces.status).toBe(200);
      expect((spaces.body as Array<{ name: string }>).filter((space) => space.name === firstSpace)).toHaveLength(1);

      const tasks = await request(routeBaseUrl, userId, "/tasks?date=2026-09-17");
      expect(tasks.status).toBe(200);
      expect((tasks.body as unknown[]).length).toBe(3);
    }
  });

  it("supports the task lifecycle, null clearing, recurrence, copying, and summaries", async () => {
    const create = await request(routeBaseUrl, users.employee, "/tasks", {
      method: "POST",
      body: json({
        taskDate: "2026-09-18",
        category: "مشروع-اختبار",
        title: "مهمة hardening",
        notes: "ملاحظة",
        priority: "high",
        recurrence: "daily",
        dueDate: "2026-09-18",
        startTime: "09:30",
        durationMinutes: 60,
        subtasks: [{ id: 1, title: "خطوة", completed: true }],
        followUps: [{ id: 1, title: "متابعة", completed: true, dueDate: "2026-09-19" }],
        links: [{ label: "مستند", url: "https://example.com/doc" }],
      }),
    });
    expect(create.status).toBe(201);
    const taskId = (create.body as { id: number }).id;
    expect(create.body).toMatchObject({
      category: "مشروع-اختبار",
      priority: "high",
      startTime: "09:30",
      durationMinutes: 60,
    });

    const completed = await request(routeBaseUrl, users.employee, `/tasks/${taskId}`, {
      method: "PATCH",
      body: json({ completed: true }),
    });
    expect(completed.status).toBe(200);

    const nextDay = await request(routeBaseUrl, users.employee, "/tasks?date=2026-09-19");
    expect(nextDay.status).toBe(200);
    expect(nextDay.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: "مهمة hardening",
        completed: false,
        subtasks: [{ id: 1, title: "خطوة", completed: false }],
        followUps: [{ id: 1, title: "متابعة", completed: false, dueDate: "2026-09-19" }],
      }),
    ]));

    const cleared = await request(routeBaseUrl, users.employee, `/tasks/${taskId}`, {
      method: "PATCH",
      body: json({ notes: null, recurrence: null, dueDate: null, startTime: null, durationMinutes: null }),
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({
      notes: null,
      recurrence: null,
      dueDate: null,
      startTime: null,
      durationMinutes: null,
    });

    const copy = await request(routeBaseUrl, users.employee, `/tasks/${taskId}/copy`, {
      method: "POST",
      body: json({ dates: ["2026-09-20", "2026-09-20", "2026-09-21"] }),
    });
    expect(copy.status).toBe(201);
    expect(copy.body).toHaveLength(2);

    const duplicateCopy = await request(routeBaseUrl, users.employee, `/tasks/${taskId}/copy`, {
      method: "POST",
      body: json({ dates: ["2026-09-20", "2026-09-21"] }),
    });
    expect(duplicateCopy.status).toBe(201);
    expect(duplicateCopy.body).toEqual([]);

    const summary = await request(routeBaseUrl, users.employee, "/tasks/summary?date=2026-09-18");
    expect(summary.status).toBe(200);
    expect(summary.body).toMatchObject({ total: 1, completed: 1, remaining: 0 });

    const otherUser = await request(routeBaseUrl, users.personal, `/tasks/${taskId}`, {
      method: "PATCH",
      body: json({ title: "اختراق" }),
    });
    expect(otherUser.status).toBe(404);
    expect((await request(routeBaseUrl, users.personal, `/tasks/${taskId}`, { method: "DELETE" })).status).toBe(404);
  });

  it("renames spaces through D1 batch and protects space links", async () => {
    const createdSpace = await request(routeBaseUrl, users.personal, "/spaces", {
      method: "POST",
      body: json({ name: "مساحة عزل", color: "#123456", description: "اختبار" }),
    });
    expect(createdSpace.status).toBe(201);
    const spaceId = (createdSpace.body as { id: number }).id;

    const duplicate = await request(routeBaseUrl, users.personal, "/spaces", {
      method: "POST",
      body: json({ name: "مساحة عزل" }),
    });
    expect(duplicate.status).toBe(409);

    const task = await request(routeBaseUrl, users.personal, "/tasks", {
      method: "POST",
      body: json({ taskDate: "2026-09-22", category: "مساحة عزل", title: "مهمة المساحة" }),
    });
    const taskId = (task.body as { id: number }).id;

    const rename = await request(routeBaseUrl, users.personal, `/spaces/${spaceId}`, {
      method: "PATCH",
      body: json({ name: "مساحة عزل جديدة", color: "#654321" }),
    });
    expect(rename.status).toBe(200);
    expect((await request(routeBaseUrl, users.personal, "/tasks?date=2026-09-22")).body)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: taskId, category: "مساحة عزل جديدة" })]));

    expect((await request(routeBaseUrl, users.employee, `/spaces/${spaceId}`, {
      method: "PATCH",
      body: json({ name: "استيلاء", color: "#000000" }),
    })).status).toBe(404);

    const link = await request(routeBaseUrl, users.personal, "/space-links", {
      method: "POST",
      body: json({ spaceId, title: "رابط", url: "https://example.com/space" }),
    });
    expect(link.status).toBe(201);
    const linkId = (link.body as { id: number }).id;

    expect((await request(routeBaseUrl, users.employee, "/space-links", {
      method: "POST",
      body: json({ spaceId, title: "استيلاء", url: "https://example.com" }),
    })).status).toBe(404);
    expect((await request(routeBaseUrl, users.employee, `/space-links/${linkId}`, { method: "DELETE" })).status).toBe(404);
    expect((await request(routeBaseUrl, users.personal, `/space-links/${linkId}`, { method: "DELETE" })).status).toBe(204);
    expect((await request(routeBaseUrl, users.personal, `/spaces/${spaceId}`, { method: "DELETE" })).status).toBe(204);
    const remainingTasks = await request(routeBaseUrl, users.personal, "/tasks?date=2026-09-22");
    expect(remainingTasks.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: taskId, title: "مهمة المساحة" }),
    ]));
  });

  it("covers goals, habits, study items, and event date validation", async () => {
    const goal = await request(routeBaseUrl, users.freelancer, "/goals", {
      method: "POST",
      body: json({ title: "هدف", target: 5, deadline: "2026-10-01" }),
    });
    expect(goal.status).toBe(201);
    const goalId = (goal.body as { id: number }).id;
    expect((await request(routeBaseUrl, users.freelancer, `/goals/${goalId}`, {
      method: "PATCH",
      body: json({ current: 3, deadline: null }),
    })).body).toMatchObject({ current: 3, deadline: null });
    expect((await request(routeBaseUrl, users.employee, `/goals/${goalId}`, { method: "DELETE" })).status).toBe(404);
    expect((await request(routeBaseUrl, users.freelancer, `/goals/${goalId}`, { method: "DELETE" })).status).toBe(204);

    const habit = await request(routeBaseUrl, users.freelancer, "/habits", {
      method: "POST",
      body: json({ name: "عادة", frequency: "weekly" }),
    });
    expect(habit.status).toBe(201);
    const habitId = (habit.body as { id: number }).id;
    expect((await request(routeBaseUrl, users.freelancer, `/habits/${habitId}`, {
      method: "PATCH",
      body: json({ streak: 2, lastCompleted: "2026-09-17" }),
    })).body).toMatchObject({ streak: 2, frequency: "weekly" });
    expect((await request(routeBaseUrl, users.freelancer, `/habits/${habitId}`, { method: "DELETE" })).status).toBe(204);

    const study = await request(routeBaseUrl, users.freelancer, "/study-items", {
      method: "POST",
      body: json({ kind: "exam", title: "اختبار", subject: "رياضيات", itemDate: "2026-09-20", notes: "مراجعة" }),
    });
    expect(study.status).toBe(201);
    const studyId = (study.body as { id: number }).id;
    expect((await request(routeBaseUrl, users.freelancer, `/study-items/${studyId}`, {
      method: "PATCH",
      body: json({ completed: true, itemDate: null, notes: null }),
    })).body).toMatchObject({ completed: true, itemDate: null, notes: null });
    expect((await request(routeBaseUrl, users.freelancer, `/study-items/${studyId}`, { method: "DELETE" })).status).toBe(204);

    const event = await request(routeBaseUrl, users.freelancer, "/events", {
      method: "POST",
      body: json({ title: "مؤتمر", startDate: "2026-09-20", endDate: "2026-09-22", imageUrl: "https://example.com/image.png" }),
    });
    expect(event.status).toBe(201);
    const eventId = (event.body as { id: number }).id;
    expect((await request(routeBaseUrl, users.freelancer, `/events/${eventId}`, {
      method: "PATCH",
      body: json({ endDate: "2026-09-19" }),
    })).status).toBe(400);
    expect((await request(routeBaseUrl, users.freelancer, `/events/${eventId}`, {
      method: "PATCH",
      body: json({ endDate: "2026-09-23", imageUrl: null }),
    })).body).toMatchObject({ endDate: "2026-09-23", imageUrl: null });
    expect((await request(routeBaseUrl, users.employee, `/events/${eventId}`, { method: "DELETE" })).status).toBe(404);
    expect((await request(routeBaseUrl, users.freelancer, `/events/${eventId}`, { method: "DELETE" })).status).toBe(204);
  });

  it("persists preferences and restricts administration", async () => {
    const defaults = await request(routeBaseUrl, users.personal, "/preferences/dashboard");
    expect(defaults.status).toBe(200);
    expect((defaults.body as { sectionOrder: string[] }).sectionOrder).toHaveLength(6);

    const saved = await request(routeBaseUrl, users.personal, "/preferences/dashboard", {
      method: "PATCH",
      body: json({ visibleSections: ["summary"], sectionOrder: ["taskMap", "summary"] }),
    });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({
      visibleSections: ["summary"],
      sectionOrder: ["taskMap", "summary", "events", "productivity", "links", "notifications"],
    });

    expect((await request(routeBaseUrl, users.student, "/admin/access")).body).toEqual({ isAdmin: true });
    expect((await request(routeBaseUrl, users.employee, "/admin/access")).body).toEqual({ isAdmin: false });
    expect((await request(routeBaseUrl, users.employee, "/admin/stats")).status).toBe(403);

    const announcement = await request(routeBaseUrl, users.student, "/admin/notifications", {
      method: "POST",
      body: json({ title: "إعلان", body: "نص الإعلان" }),
    });
    expect(announcement.status).toBe(201);
    expect((await request(routeBaseUrl, users.personal, "/notifications")).body)
      .toEqual(expect.arrayContaining([expect.objectContaining({ title: "إعلان" })]));
  });

  it("returns clean 400 errors for invalid date input", async () => {
    const invalidDate = await request(routeBaseUrl, users.student, "/tasks?date=2026-02-31");
    expect(invalidDate.status).toBe(400);
    expect(invalidDate.body).toMatchObject({ error: "date must use YYYY-MM-DD" });

    const invalidBody = await request(routeBaseUrl, users.student, "/events", {
      method: "POST",
      body: json({ title: "حدث", startDate: "2026-09-20", endDate: "not-a-date" }),
    });
    expect(invalidBody.status).toBe(400);
  });
});