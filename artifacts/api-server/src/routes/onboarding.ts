import { Router, type IRouter } from "express";
import {
  CompleteOnboardingBody,
  CompleteOnboardingResponse,
  GetOnboardingStatusResponse,
  UpdateUsageTypeBody,
  UpdateUsageTypeResponse,
} from "@workspace/api-zod";
import { and, eq, isNull } from "drizzle-orm";
import { appUsersTable, db, spacesTable, tasksTable } from "@workspace/db";

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
  return database.transaction(async (tx) => {
    const [claimed] = await tx
      .update(appUsersTable)
      .set({ usageType, onboardedAt: new Date() })
      .where(and(
        eq(appUsersTable.userId, userId),
        isNull(appUsersTable.onboardedAt),
      ))
      .returning({ userId: appUsersTable.userId });

    if (!claimed) return false;

    const template = templates[usageType];
    await tx.insert(spacesTable).values(template.spaces.map(([name, color, description]) => ({
      ownerId: userId,
      name,
      color,
      description,
    }))).onConflictDoNothing();
    await tx.insert(tasksTable).values(template.tasks.map(([category, title]) => ({
      ownerId: userId,
      taskDate,
      category,
      title,
    })));
    return true;
  });
}

router.get("/onboarding", async (req, res, next) => {
  try {
    const [user] = await db
      .select({
        usageType: appUsersTable.usageType,
        onboardedAt: appUsersTable.onboardedAt,
      })
      .from(appUsersTable)
      .where(eq(appUsersTable.userId, req.userId!))
      .limit(1);

    res.json(GetOnboardingStatusResponse.parse({
      completed: Boolean(user?.onboardedAt),
      usageType: user?.usageType ?? null,
    }));
  } catch (error) {
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
