import { Router, type IRouter } from "express";
import {
  CompleteOnboardingBody,
  CompleteOnboardingResponse,
  GetOnboardingStatusResponse,
  UpdateUsageTypeBody,
  UpdateUsageTypeResponse,
} from "@workspace/api-zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { appUsersTable, db, spacesTable, tasksTable } from "@workspace/db";
import { logOperationError, withD1OperationLogging } from "../utils/d1-operation";

const router: IRouter = Router();

const templates = {
  student: {
    spaces: [
      ["الدراسة", "#2e8d77", "المحاضرات والمراجعة"],
      ["الواجبات", "#d39a2f", "التكاليف ومواعيد التسليم"],
      ["الحياة", "#6678bd", "ما يحافظ على توازنك"],
    ],
    tasks: [
      ["الدراسة", "راجع أهم درس اليوم"],
      ["الواجبات", "حدّد أقرب موعد تسليم"],
      ["الحياة", "خصص وقتاً للراحة"],
    ],
  },
  employee: {
    spaces: [
      ["العمل", "#2e8d77", "أولويات ومسؤوليات اليوم"],
      ["الاجتماعات", "#d39a2f", "التحضير والمتابعة"],
      ["التطوير", "#6678bd", "مهارات ونمو مهني"],
    ],
    tasks: [
      ["العمل", "حدّد أهم نتيجة لليوم"],
      ["الاجتماعات", "راجع اجتماعات اليوم"],
      ["التطوير", "خصص وقتاً لتطوير مهارة"],
    ],
  },
  freelancer: {
    spaces: [
      ["العملاء", "#2e8d77", "تسليمات وتواصل العملاء"],
      ["المشاريع", "#d39a2f", "العمل العميق الجاري"],
      ["الإدارة", "#c97768", "عروض وفواتير وتنظيم"],
    ],
    tasks: [
      ["العملاء", "تابع أهم رسالة من عميل"],
      ["المشاريع", "أنجز خطوة تسليم واضحة"],
      ["الإدارة", "راجع أعمالك الإدارية"],
    ],
  },
  personal: {
    spaces: [
      ["أولوياتي", "#2e8d77", "ما يستحق تركيزك اليوم"],
      ["المنزل", "#d39a2f", "شؤون البيت والعائلة"],
      ["العافية", "#77964d", "صحتك وراحتك"],
    ],
    tasks: [
      ["أولوياتي", "اختر أهم خطوة لليوم"],
      ["المنزل", "أنجز أمراً منزلياً صغيراً"],
      ["العافية", "خصص وقتاً لنفسك"],
    ],
  },
} as const;

export async function completeOnboarding(
  userId: string,
  usageType: keyof typeof templates,
  taskDate: Date,
  database: typeof db = db,
) {
  const [claimed] = await withD1OperationLogging(
    "POST /api/onboarding",
    "claim app_users onboarding row",
    () =>
      database
        .update(appUsersTable)
        .set({ usageType })
        .where(and(
          eq(appUsersTable.userId, userId),
          isNull(appUsersTable.onboardedAt),
        ))
        .returning({ userId: appUsersTable.userId }),
  );

  if (!claimed) return false;

  const template = templates[usageType];
  await withD1OperationLogging(
    "POST /api/onboarding",
    "insert starter spaces",
    () =>
      database.insert(spacesTable).values(template.spaces.map(([name, color, description]) => ({
        ownerId: userId,
        name,
        color,
        description,
      }))).onConflictDoNothing(),
  );

  const starterTaskTitles = template.tasks.map(([, title]) => title);
  const existingTasks = await withD1OperationLogging(
    "POST /api/onboarding",
    "select existing starter tasks",
    () =>
      database
        .select({ title: tasksTable.title })
        .from(tasksTable)
        .where(and(
          eq(tasksTable.ownerId, userId),
          eq(tasksTable.taskDate, taskDate),
          inArray(tasksTable.title, starterTaskTitles),
        )),
  );
  const existingTaskTitles = new Set(existingTasks.map((task) => task.title));
  const missingTasks = template.tasks
    .filter(([, title]) => !existingTaskTitles.has(title))
    .map(([category, title]) => ({
      ownerId: userId,
      taskDate,
      category,
      title,
    }));

  if (missingTasks.length > 0) {
    await withD1OperationLogging(
      "POST /api/onboarding",
      "insert missing starter tasks",
      () => database.insert(tasksTable).values(missingTasks),
    );
  }

  await withD1OperationLogging(
    "POST /api/onboarding",
    "mark app_users onboarding complete",
    () =>
      database
        .update(appUsersTable)
        .set({ onboardedAt: new Date() })
        .where(and(
          eq(appUsersTable.userId, userId),
          isNull(appUsersTable.onboardedAt),
        )),
  );

  return true;
}

router.get("/onboarding", async (req, res, next) => {
  try {
    const [user] = await withD1OperationLogging(
      "GET /api/onboarding",
      "select app_users onboarding status",
      () =>
        db
          .select({
            usageType: appUsersTable.usageType,
            onboardedAt: appUsersTable.onboardedAt,
          })
          .from(appUsersTable)
          .where(eq(appUsersTable.userId, req.userId!))
          .limit(1),
    );

    res.json(GetOnboardingStatusResponse.parse({
      completed: Boolean(user?.onboardedAt),
      usageType: user?.usageType ?? null,
    }));
  } catch (error) {
    logOperationError("GET /api/onboarding", "request handler", error);
    next(error);
  }
});

router.post("/onboarding", async (req, res, next) => {
  try {
    const input = CompleteOnboardingBody.parse(req.body);
    const usageType = input.usageType;
    const taskDate = input.taskDate;

    const completed = await completeOnboarding(req.userId!, usageType, taskDate);

    const [user] = await db
      .select({
        usageType: appUsersTable.usageType,
        onboardedAt: appUsersTable.onboardedAt,
      })
      .from(appUsersTable)
      .where(eq(appUsersTable.userId, req.userId!))
      .limit(1);

    res.json(CompleteOnboardingResponse.parse({
      completed: completed || Boolean(user?.onboardedAt),
      usageType: user?.usageType ?? null,
    }));
  } catch (error) {
    next(error);
  }
});

router.patch("/onboarding", async (req, res, next) => {
  try {
    const { usageType } = UpdateUsageTypeBody.parse(req.body);

    const [user] = await db
      .update(appUsersTable)
      .set({ usageType })
      .where(eq(appUsersTable.userId, req.userId!))
      .returning({
        usageType: appUsersTable.usageType,
        onboardedAt: appUsersTable.onboardedAt,
      });

    res.json(UpdateUsageTypeResponse.parse({
      completed: Boolean(user?.onboardedAt),
      usageType: user?.usageType ?? null,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
