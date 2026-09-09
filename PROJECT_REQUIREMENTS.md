# وثيقة متطلبات مشروع «إنجازك اليومي»

**الإصدار:** 1.0  
**تاريخ الاستخراج:** 9 سبتمبر 2026  
**حالة الوثيقة:** مرجع متطلبات مستخرج من الكود الحالي وخطة المهاجرة  
**لغة المنتج:** العربية أولًا، مع واجهة RTL  
**نوع المنتج:** مساحة إنتاجية يومية للويب والجوال  

> هذه الوثيقة تصف الحقيقة الحالية للمشروع كما تظهر في المستودع، وتفصل بين الوظائف
> الموجودة حاليًا، ووظائف المهاجرة إلى Laravel، وما بقي مطلوبًا قبل اعتبار المهاجرة
> مكتملة. أسماء المسارات والحقول البرمجية تبقى بالإنجليزية عند الحاجة للحفاظ على
> التوافق مع الكود وتطبيق الجوال.

---

## 1. الملخص التنفيذي

«إنجازك اليومي» تطبيق عربي لإدارة اليوم والعمل عبر مساحات متعددة. يسمح للمستخدم
بتقسيم مهامه حسب المساحة أو الشركة، تخطيط المهام بالتاريخ والوقت والأولوية،
إضافة الملاحظات والروابط والمتابعات والمهام الفرعية، ثم متابعة الأهداف والعادات
وخطة الدراسة والأحداث والإحصائيات.

المشروع الحالي يتكون من:

1. **واجهة ويب React/Vite** تعمل حاليًا وتستخدم Clerk وReact Query.
2. **خادم Express/TypeScript** يعمل حاليًا ويستخدم PostgreSQL وDrizzle.
3. **تطبيق جوال Expo/React Native** يعمل كرفيق للجوال ويعتمد على عقد الـAPI.
4. **مشروع Laravel 13 مستقل** أُنشئ كمشروع مهاجرة، ويحتوي على طبقة API أولية
   وواجهة HTML/JavaScript انتقالية.
5. **عقد OpenAPI** ومولدات Zod/React Query كمصدر رسمي لتنسيق البيانات.

الهدف النهائي من المهاجرة:

- تحويل الـBackend إلى Laravel 13.
- تحويل واجهة الويب إلى HTML وJavaScript دون React.
- استخدام MySQL جديدة وفارغة دون نقل بيانات PostgreSQL.
- الحفاظ على نفس مسارات واستجابات الـAPI حتى يستمر تطبيق الجوال دون تعديل.
- إبقاء المصادقة عبر Clerk وعزل البيانات حسب الحساب.

---

## 2. النطاق

### 2.1 داخل النطاق

- تسجيل الحسابات وتسجيل الدخول والخروج عبر Clerk.
- onboarding حسب نوع استخدام الحساب.
- إدارة الحساب والبيانات الخاصة به.
- إدارة المهام اليومية والمساحات.
- التخطيط بالتاريخ والوقت والمدة والأولوية.
- التكرار والتاريخ المستحق والمهام الفرعية والمتابعات.
- الروابط المرتبطة بالمهام أو المساحات.
- الأهداف والعادات وخطة الدراسة.
- الأحداث التنازلية والتواريخ.
- ملخصات الإنتاجية والإحصائيات.
- إعلانات داخل التطبيق.
- لوحة إدارة للحساب الإداري الأساسي.
- تخصيص لوحة التحكم وترتيب أقسامها.
- RTL والعربية والتصميم المتجاوب.
- واجهة ويب Vanilla HTML/JavaScript في النسخة المستهدفة.
- استمرار عمل تطبيق Expo الجوال مع الـAPI نفسه.

### 2.2 خارج النطاق الحالي

- الدفع والاشتراكات.
- البريد الإلكتروني.
- تكاملات التقويم الخارجية.
- ترحيل البيانات القديمة إلى MySQL.
- تغيير كود تطبيق الجوال، إلا إذا تطلب إصلاح إعدادات نشره.
- اختيار مزود الاستضافة النهائي.
- تغيير مسارات الـAPI أو شكل JSON المستخدم من الجوال.

---

## 3. مصطلحات المجال

| المصطلح | المعنى |
|---|---|
| الحساب | هوية Clerk التي يملكها المستخدم وتحدد `ownerId`. |
| المساحة | تصنيف دائم للمهام مثل `INV` أو `BR` أو `Qaff` أو `Wootz` أو `Self`. |
| نوع الاستخدام | اختيار onboarding: `student` أو `employee` أو `freelancer` أو `personal`. |
| مهمة اليوم | سجل مرتبط بتاريخ محدد ومساحة وحساب مالك. |
| المهمة الفرعية | عنصر صغير داخل المهمة له حالة إكمال مستقلة. |
| المتابعة | إجراء أو تواصل مرتبط بالمهمة وله عنوان وتاريخ وحالة. |
| الحدث | فترة زمنية تعرض كعدّ تنازلي أو عنصر زمني في لوحة التحكم. |
| المدير الأساسي | الحساب الأول أو الحساب المحدد في `ADMIN_USER_ID`، وله صلاحيات الإدارة. |
| البيانات القديمة | سجلات PostgreSQL الموجودة قبل تفعيل ملكية الحسابات، إن وجدت. |

---

## 4. المستخدمون والصلاحيات

### 4.1 زائر غير مسجل

- يستطيع رؤية صفحة الهبوط أو شاشة تسجيل الدخول.
- لا يستطيع قراءة أو تعديل أي بيانات إنتاجية.
- أي مسار محمي يعيد `401`.

### 4.2 مستخدم مسجل

- يقرأ ويعدل بياناته التي يطابق مالكها `ownerId`.
- ينشئ المساحات والمهام والأهداف والعادات وعناصر الدراسة والأحداث والروابط.
- يغير نوع استخدام حسابه بعد onboarding.
- لا يستطيع الوصول إلى سجلات حساب آخر حتى لو عرف رقم السجل.

### 4.3 المدير الأساسي

- يقرأ `/admin/access`.
- يقرأ إحصائيات التطبيق عبر `/admin/stats`.
- ينشئ إعلانات عامة عبر `/admin/notifications`.
- لا تُمنح صلاحية الإدارة لكل المستخدمين.
- أولوية تحديد المدير:
  1. قيمة `ADMIN_USER_ID` إن كانت مضبوطة.
  2. أول حساب مسجل زمنيًا كحل احتياطي.

### 4.4 عزل الحساب عند التبديل

- يجب إنشاء Query Client أو مخزن حالة جديد عند تغير هوية Clerk.
- يجب إعادة تحميل onboarding والصلاحيات والبيانات للحساب الجديد.
- يجب ألا تظهر بيانات الحساب السابق ولو مؤقتًا أثناء الانتقال.
- يجب إظهار حالة انتقال واضحة بدل شاشة فارغة.
- يجب تنظيف أي cache يعتمد على الحساب عند تسجيل الخروج أو التبديل.

---

## 5. المتطلبات الوظيفية

## 5.1 المصادقة وتهيئة الحساب

### المتطلبات

- استخدام Clerk كمصدر الحقيقة لهوية المستخدم.
- عدم تخزين ملف مستخدم كامل محليًا؛ يُخزن فقط ما يلزم لملكية البيانات:
  - `userId`
  - `usageType`
  - `onboardedAt`
  - `createdAt`
- يجب قراءة Bearer token في الـAPI والتحقق من:
  - الخوارزمية `RS256`.
  - `kid` الموجود في JWKS.
  - التوقيع.
  - `exp`.
  - `iss` عند ضبط `CLERK_ISSUER`.
- عند غياب إعدادات Clerk يجب رفض المسارات المحمية بدل السماح بالمرور.

### onboarding

- يعرض النظام حالة الحساب الحالية:
  - `completed`
  - `usageType`
- عند الإكمال يرسل المستخدم:
  - `usageType`
  - `taskDate`
- الإكمال الأول ينشئ:
  - مساحات البداية المناسبة لنوع الاستخدام.
  - مهام بداية لذلك اليوم.
  - `onboardedAt`.
- لا يجوز أن يعيد الطلب المتكرر إنشاء القوالب.
- تغيير `usageType` لاحقًا لا يحذف المساحات أو المهام الموجودة ولا يستبدلها.

### أنواع الاستخدام

القيم المسموحة:

- `student`
- `employee`
- `freelancer`
- `personal`

---

## 5.2 المهام اليومية

### بيانات المهمة

كل مهمة يجب أن تدعم:

| الحقل | النوع | القاعدة |
|---|---|---|
| `id` | integer | معرف فريد |
| `taskDate` | date | تاريخ يومي دون تحويل timezone |
| `ownerId` | string | المالك الداخلي، لا يعاد للمستخدم عند عدم الحاجة |
| `category` | string | اسم المساحة |
| `title` | string | مطلوب وغير فارغ |
| `notes` | string/null | ملاحظات اختيارية |
| `priority` | enum | `low`, `medium`, `high` |
| `sortOrder` | integer | ترتيب العرض والسحب |
| `startTime` | `HH:mm`/null | وقت بداية اختياري |
| `durationMinutes` | integer/null | من 5 إلى 1440 في عقد OpenAPI |
| `recurrence` | string/null | مثل `daily`, `weekly`, `monthly` |
| `dueDate` | date/null | تاريخ مستحق اختياري |
| `subtasks` | JSON array | مهام فرعية |
| `completed` | boolean | حالة الإكمال |
| `links` | JSON array | روابط باسم ورابط |
| `followUps` | JSON array | متابعات |
| `createdAt` | date-time | وقت الإنشاء |
| `updatedAt` | date-time | آخر تعديل |

### سلوك المهمة

- عرض المهام حسب:
  - يوم محدد عبر `date`.
  - نطاق عبر `dateFrom` و`dateTo`.
  - المساحة.
- إضافة وتعديل وإكمال وحذف المهمة.
- عند إنشاء مهمة جديدة:
  - تُربط بالحساب الحالي.
  - يُحسب ترتيب افتراضي بعد آخر مهمة في نفس اليوم والمساحة.
  - تُستخدم أولوية `medium` عند عدم إرسال أولوية.
- عند تعديل `startTime` أو `durationMinutes` بقيمة فارغة يجب حفظ `null`
  صراحة، لا الاحتفاظ بالقيمة القديمة.
- عند إكمال مهمة متكررة:
  - يحسب النظام التاريخ التالي حسب التكرار.
  - ينشئ نسخة جديدة إن لم تكن موجودة.
  - يعيد ضبط المهام الفرعية والمتابعات إلى غير مكتملة.
- نسخ المهمة يسمح بإرسال عدة تواريخ، مع منع النسخ المكرر لنفس الحساب واليوم
  والمساحة والعنوان.
- السحب والإفلات هو وسيلة تغيير ترتيب المهام.
- لا يجب عرض خياري «تقديم» و«تأخير» للمهمة.
- قائمة المهمة في RTL يجب أن:
  - تغلق بالنقر خارجها.
  - تغلق بزر `Escape`.
  - تثبت داخل نافذة العرض.
  - تنقلب إلى الجهة المناسبة قرب حافة الشاشة.

### المهام الفرعية والمتابعات

صيغة المهمة الفرعية:

```json
{
  "id": 1,
  "title": "مراجعة المستند",
  "completed": false
}
```

صيغة المتابعة:

```json
{
  "id": 1,
  "title": "إرسال تحديث للعميل",
  "completed": false,
  "dueDate": "2026-09-12"
}
```

### الروابط داخل المهمة

```json
{
  "label": "ورقة العمل",
  "url": "https://example.com/work-sheet"
}
```

---

## 5.3 المساحات

- عرض جميع مساحات الحساب.
- إنشاء مساحة باسم ولون ووصف اختياري.
- منع تكرار اسم المساحة للحساب نفسه.
- تعديل الاسم واللون والوصف.
- عند تغيير اسم المساحة يجب تحديث `category` للمهام التابعة لها في الحساب نفسه.
- حذف المساحة لا يجب أن يحذف مهامها تلقائيًا دون تأكيد واضح.
- المساحة الافتراضية:
  - اللون `#2e8d77` في المخطط الحالي.

---

## 5.4 لوحة اليوم

يجب أن تعرض لوحة اليوم:

- التاريخ المحدد والتنقل بين الأيام.
- إجمالي المهام.
- المكتمل.
- المتبقي.
- توزيع المهام حسب المساحة.
- قائمة المهام القابلة للفرز والسحب.
- وقت البداية والمدة عند وجودهما.
- مؤشرات الأولوية.
- الروابط والمتابعات والمهام الفرعية.
- حالات التحميل والفشل والفراغ.

### أقسام لوحة التحكم

الأقسام المعرفة حاليًا:

- `summary`
- `events`
- `productivity`
- `links`
- `notifications`
- `taskMap`

يجب أن يستطيع المستخدم:

- إخفاء وإظهار الأقسام.
- تغيير ترتيب الأقسام.
- حفظ التفضيلات للحساب.
- استعادة الإعدادات الافتراضية عند عدم وجود سجل تفضيلات.

---

## 5.5 الأهداف

كل هدف يدعم:

- العنوان.
- الهدف الرقمي `target`.
- التقدم الحالي `current`.
- الموعد النهائي `deadline`.
- حالة `completed`.
- الإنشاء والتعديل والحذف.
- عزل الحساب.

يجب أن يعرض المنتج نسبة التقدم أو مؤشرًا واضحًا عند توفر `target` و`current`.

---

## 5.6 العادات

كل عادة تدعم:

- الاسم.
- التكرار: `daily` أو `weekly`.
- عدد أيام الاستمرارية `streak`.
- تاريخ آخر إكمال `lastCompleted`.
- إنشاء وتعديل وحذف.
- تحديث الاستمرارية عند الإكمال.

---

## 5.7 خطة الدراسة

كل عنصر دراسة يدعم:

- النوع:
  - `subject`
  - `assignment`
  - `exam`
  - `review`
- العنوان.
- المادة.
- التاريخ.
- ملاحظات.
- حالة الإكمال.
- الإنشاء والتعديل والحذف.
- الفلترة أو الترتيب حسب التاريخ والمادة.

---

## 5.8 الأحداث والتواريخ

كل حدث يدعم:

- العنوان.
- `startDate`.
- `endDate`.
- اللون.
- رابط صورة اختياري.
- إنشاء وتعديل وحذف.
- رفض الحدث عندما يكون `endDate` قبل `startDate`.
- عرضه كعد تنازلي أو بطاقة زمنية في لوحة التحكم.

---

## 5.9 روابط المساحات

- إنشاء رابط دائم لمساحة.
- التحقق من أن المساحة مملوكة للحساب قبل إضافة الرابط.
- عرض الروابط كلها أو حسب `spaceId`.
- حذف الرابط.
- الحقول:
  - `spaceId`
  - `title`
  - `url`
  - `createdAt`

---

## 5.10 الإشعارات داخل التطبيق

- عرض آخر الإعلانات العامة.
- الإعلان يحتوي:
  - `id`
  - `title`
  - `body`
  - `createdAt`
- لا يوجد حاليًا تكامل بريد أو دفع أو تقويم خارجي.
- إنشاء الإعلان متاح للمدير الأساسي فقط.

---

## 5.11 لوحة الإدارة

يجب أن تدعم:

- فحص صلاحية الحساب الإداري.
- إحصائيات:
  - عدد المستخدمين.
  - عدد المهام.
  - عدد المهام المكتملة.
  - عدد المساحات.
  - عدد الأهداف.
  - عدد العادات.
  - المستخدمون النشطون خلال 30 يومًا.
  - نسبة الإنجاز.
  - توزيع أنواع الاستخدام.
- نشر إعلان عام داخل التطبيق.
- إعادة `403` عند محاولة الوصول الإداري من حساب غير مصرح.

---

## 6. متطلبات الواجهة والتجربة

### 6.1 الاتجاه واللغة

- اللغة الافتراضية العربية.
- `dir="rtl"` على الويب.
- يجب ألا تنقلب أيقونات أو قوائم أو popovers في الاتجاه الخطأ.
- يمكن إبقاء أسماء الحقول والمسارات البرمجية بالإنجليزية داخل التوثيق والكود.

### 6.2 حالات الحساب

الواجهة يجب أن تتعامل مع:

- تحميل Clerk.
- تحميل الحساب.
- تسجيل الخروج.
- تبديل الحساب.
- onboarding غير مكتمل.
- حساب مكتمل.
- خطأ API.
- صفحة غير موجودة.
- قائمة فارغة.
- تحميل قسم واحد دون تعطيل بقية الصفحة.

### 6.3 الألوان والسمات

الويب الحالي يدعم لوحات:

- `orbit`
- `sea`
- `coral`
- `violet`
- `dusk`
- `blush`
- `noirGold`
- `earthNavy`
- `urbanBlue`
- `custom`

كل لوحة يجب أن تعرف على الأقل:

- الخلفية.
- النص الأساسي.
- الحدود.
- الكروت.
- نص الكروت.
- حدود الكروت.
- `popover` و`popover-foreground` و`popover-border`.
- الأساسي والثانوي.
- muted وaccent.
- الإدخال وحلقة التركيز.
- ألوان الحذف.

لا يجوز أن تتسرب ألوان لوحة مظلمة إلى القوائم أو النوافذ المنبثقة في لوحة فاتحة.

### 6.4 الوصولية

- حقول الإدخال لها labels أو aria-label.
- الأزرار ذات الأيقونات لها وصف.
- حالات الخطأ تستخدم `role="alert"` أو ما يعادلها.
- التركيز بلوحة المفاتيح مرئي.
- القوائم تغلق بـ`Escape`.
- لا تعتمد الحالة على اللون فقط.

### 6.5 الاستجابة

- تعمل لوحة الويب على سطح المكتب والجوال.
- لا تخرج النوافذ المنبثقة عن viewport.
- تبقى نماذج المهام قابلة للاستخدام في الشاشات الصغيرة.
- تطبيق Expo يحتفظ بملاءمته للشاشات الأصلية وSafe Area ولوحة المفاتيح.

---

## 7. عقد الـAPI

### 7.1 قواعد عامة

- البادئة الرسمية: `/api`.
- الصحة غير محمية:
  - `GET /api`
  - `GET /api/healthz`
- كل المسارات الأخرى تتطلب Clerk Bearer token.
- الاستجابات JSON.
- التواريخ اليومية بصيغة `YYYY-MM-DD`.
- الطوابع الزمنية بصيغة ISO date-time.
- فشل التحقق من الهوية: `401`.
- السجل غير المملوك أو غير الموجود: `404`.
- محاولة الإدارة دون صلاحية: `403`.
- التكرار في أسماء المساحات: `409`.
- البيانات غير الصالحة: `400` أو استجابة أخطاء التحقق في Laravel.
- الإنشاء الناجح: `201`.
- الحذف الناجح: `204`.

### 7.2 جدول المسارات

| الطريقة | المسار | الحماية | الغرض |
|---|---|---:|---|
| GET | `/api` | لا | فحص الصحة |
| GET | `/api/healthz` | لا | فحص صحة الخدمة |
| GET | `/api/onboarding` | نعم | حالة onboarding |
| POST | `/api/onboarding` | نعم | إكمال onboarding وإنشاء القوالب |
| PATCH | `/api/onboarding` | نعم | تغيير نوع الاستخدام |
| GET | `/api/tasks` | نعم | قائمة المهام حسب يوم أو نطاق |
| POST | `/api/tasks` | نعم | إنشاء مهمة |
| PATCH | `/api/tasks/{id}` | نعم | تحديث مهمة |
| DELETE | `/api/tasks/{id}` | نعم | حذف مهمة |
| POST | `/api/tasks/{id}/copy` | نعم | نسخ المهمة إلى تواريخ |
| GET | `/api/tasks/summary` | نعم | ملخص المهام |
| GET | `/api/preferences/dashboard` | نعم | قراءة تفضيلات اللوحة |
| PATCH | `/api/preferences/dashboard` | نعم | تعديل تفضيلات اللوحة |
| GET | `/api/notifications` | نعم | الإعلانات العامة |
| GET | `/api/goals` | نعم | قائمة الأهداف |
| POST | `/api/goals` | نعم | إنشاء هدف |
| PATCH | `/api/goals/{id}` | نعم | تعديل هدف |
| DELETE | `/api/goals/{id}` | نعم | حذف هدف |
| GET | `/api/habits` | نعم | قائمة العادات |
| POST | `/api/habits` | نعم | إنشاء عادة |
| PATCH | `/api/habits/{id}` | نعم | تعديل عادة |
| DELETE | `/api/habits/{id}` | نعم | حذف عادة |
| GET | `/api/study-items` | نعم | قائمة عناصر الدراسة |
| POST | `/api/study-items` | نعم | إنشاء عنصر دراسة |
| PATCH | `/api/study-items/{id}` | نعم | تعديل عنصر دراسة |
| DELETE | `/api/study-items/{id}` | نعم | حذف عنصر دراسة |
| GET | `/api/spaces` | نعم | قائمة المساحات |
| POST | `/api/spaces` | نعم | إنشاء مساحة |
| PATCH | `/api/spaces/{id}` | نعم | تعديل مساحة |
| DELETE | `/api/spaces/{id}` | نعم | حذف مساحة |
| GET | `/api/space-links` | نعم | قائمة روابط المساحات |
| POST | `/api/space-links` | نعم | إنشاء رابط مساحة |
| DELETE | `/api/space-links/{id}` | نعم | حذف رابط مساحة |
| GET | `/api/events` | نعم | قائمة الأحداث |
| POST | `/api/events` | نعم | إنشاء حدث |
| PATCH | `/api/events/{id}` | نعم | تعديل حدث |
| DELETE | `/api/events/{id}` | نعم | حذف حدث |
| GET | `/api/admin/access` | نعم | فحص المدير |
| GET | `/api/admin/stats` | نعم/مدير | إحصائيات الإدارة |
| POST | `/api/admin/notifications` | نعم/مدير | إنشاء إعلان |

### 7.3 مصدر العقد

المصدر الرسمي لعقد الـAPI الحالي:

```text
lib/api-spec/openapi.yaml
```

عند تغيير endpoint أو schema:

1. تعديل OpenAPI أولًا.
2. تشغيل توليد Zod وReact Query.
3. تحديث Express أو Laravel بما يطابق العقد.
4. اختبار تطبيق الجوال على نفس الاستجابة.

---

## 8. نموذج البيانات

### 8.1 الجداول الحالية في PostgreSQL

| الجدول | الغرض |
|---|---|
| `app_users` | ربط Clerk بالحساب المحلي ونوع الاستخدام |
| `app_settings` | إعدادات singleton، ومنها قفل claim للبيانات القديمة |
| `daily_tasks` | المهام اليومية وحقول JSON التابعة لها |
| `task_spaces` | مساحات الحساب |
| `countdown_events` | الأحداث الزمنية |
| `space_links` | الروابط الدائمة للمساحات |
| `goals` | الأهداف |
| `habits` | العادات |
| `study_items` | عناصر خطة الدراسة |
| `dashboard_preferences` | أقسام وترتيب لوحة المستخدم |
| `broadcast_notifications` | الإعلانات العامة |

### 8.2 قواعد الملكية

- الجداول الإنتاجية يجب أن تتضمن `owner_id` أو `ownerId`.
- كل استعلام قراءة أو تعديل أو حذف يجب أن يربط السجل بالحساب الحالي.
- لا يكفي التحقق من رقم السجل وحده.
- السجلات القديمة التي يكون `owner_id` فيها فارغًا تُطالب بها أول هوية
  مصادق عليها مرة واحدة فقط.
- قفل المطالبة يكون ذريًا عبر سجل singleton في `app_settings`.
- لا تُجرى مطالبة جديدة بعد تسجيل أول مالك.

### 8.3 قاعدة البيانات الهدف

- قاعدة MySQL جديدة وفارغة.
- لا يتم نسخ بيانات PostgreSQL.
- يجب تنفيذ migrations Laravel على MySQL.
- يجب مراجعة توافق:
  - JSON.
  - UUID للإعلانات.
  - التواريخ اليومية.
  - الفهارس المركبة.
  - القيم الافتراضية.
  - الحقول nullable.

---

## 9. البنية الحالية

```text
المستخدم
   │
   ├── Web React/Vite
   │      ├── Clerk React
   │      ├── React Query
   │      ├── Wouter
   │      └── OpenAPI-generated client
   │
   ├── Mobile Expo/React Native
   │      ├── Expo Router
   │      ├── React Query
   │      └── نفس API
   │
   └── Express API
          ├── Clerk Express middleware
          ├── Auth + ownership provisioning
          ├── Zod validation
          ├── Route groups
          └── Drizzle ORM → PostgreSQL
```

### 9.1 مستودع الويب

```text
artifacts/daily-tasks-manager/
├── src/App.tsx
├── src/pages/
│   ├── landing.tsx
│   ├── home.tsx
│   ├── onboarding.tsx
│   ├── admin.tsx
│   └── not-found.tsx
├── src/components/
│   ├── daily-plan.tsx
│   ├── task-card.tsx
│   ├── task-form.tsx
│   ├── space-form.tsx
│   ├── productivity-hub.tsx
│   ├── events-section.tsx
│   ├── space-links-section.tsx
│   ├── notification-center.tsx
│   ├── dashboard-customizer.tsx
│   ├── palette-picker.tsx
│   └── focus-timer.tsx
├── src/theme-palette.ts
├── src/index.css
└── .replit-artifact/artifact.toml
```

### 9.2 خادم Express

```text
artifacts/api-server/
├── src/app.ts
├── src/index.ts
├── src/middlewares/
│   ├── auth.ts
│   └── clerkProxyMiddleware.ts
├── src/routes/
│   ├── health.ts
│   ├── onboarding.ts
│   ├── tasks.ts
│   ├── spaces.ts
│   ├── events.ts
│   ├── space-links.ts
│   ├── productivity.ts
│   ├── preferences.ts
│   ├── notifications.ts
│   └── admin.ts
└── .replit-artifact/artifact.toml
```

### 9.3 تطبيق الجوال

```text
artifacts/daily-tasks-mobile/
├── app/
│   ├── _layout.tsx
│   ├── +not-found.tsx
│   └── (tabs)/
├── components/
├── hooks/
├── constants/colors.ts
├── server/serve.js
├── static-build/
└── .replit-artifact/artifact.toml
```

تطبيق الجوال يركز على:

- مهام اليوم.
- المساحات.
- الأهداف.
- العادات.
- RTL وتجربة الهاتف.

### 9.4 مشروع Laravel المستهدف

```text
services/laravel-api/
├── app/Http/Controllers/LegacyApiController.php
├── app/Http/Middleware/ClerkAuth.php
├── bootstrap/app.php
├── config/services.php
├── database/migrations/
├── routes/api.php
├── routes/web.php
├── resources/views/app.blade.php
├── public/app.js
├── public/app.css
├── .env.example
└── composer.json
```

الوضع الحالي:

- Laravel `13.31.0`.
- PHP `8.4`.
- الـAPI الأساسي موجود.
- واجهة HTML/JavaScript الحالية تغطي تسجيل الدخول والمهام والمساحات.
- قاعدة MySQL الفعلية لم تُربط بعد.
- لا توجد عملية نقل بيانات.

---

## 10. متطلبات المهاجرة إلى Laravel

### 10.1 التوافق

- يجب أن تستجيب Laravel لنفس مسارات `/api`.
- يجب الحفاظ على أسماء الحقول camelCase في JSON.
- يجب الحفاظ على status codes.
- يجب الحفاظ على قواعد الملكية.
- يجب ألا يحتاج تطبيق الجوال إلى تعديل.
- يجب تشغيل الخادمين بالتوازي خلال مرحلة الاختبار إذا لزم الأمر.

### 10.2 المصادقة

- لا يُستخدم حل مصادقة بديل لـClerk.
- لا تُحفظ مفاتيح أو tokens داخل المستودع.
- الإعدادات المطلوبة تكون عبر بيئة التشغيل الآمنة:
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_JWKS_URL`
  - `CLERK_ISSUER`
  - `ADMIN_USER_ID`
- يجب اختبار token صالح، token منتهي، token بتوقيع خاطئ، وtoken بلا `sub`.

### 10.3 واجهة الويب المستهدفة

- HTML وCSS وJavaScript مباشر.
- لا تعتمد الواجهة الجديدة على React.
- يمكن استخدام Blade لحقن إعدادات عامة غير سرية مثل publishable key.
- API calls تستخدم Bearer token من Clerk.
- يجب نقل وظائف React الحالية، لا الاكتفاء بشاشة المهام.
- الأقسام المطلوب نقلها:
  - الهبوط والمصادقة.
  - onboarding.
  - خطة اليوم.
  - المساحات.
  - الأهداف.
  - العادات.
  - الدراسة.
  - الأحداث.
  - الروابط.
  - الإعلانات.
  - التخصيص.
  - الإدارة.

### 10.4 قاعدة البيانات

- لا تُستخدم SQLite كقاعدة التطبيق النهائية.
- SQLite المؤقتة مسموحة فقط لفحص migrations محليًا عند غياب MySQL.
- لا يوضع أي credential داخل `.env.example` أو ملفات Git.
- يجب تطبيق migration على MySQL جديدة وفارغة.

---

## 11. متطلبات التشغيل والنشر

### 11.1 الأدوات

- Node.js 24.
- TypeScript 5.9.
- pnpm workspaces.
- PHP 8.4.
- Composer 2.
- Laravel 13.
- PostgreSQL للتطبيق الحالي.
- MySQL للنسخة المستهدفة.

### 11.2 الـworkflows الحالية

| الاسم | الأمر | المسار |
|---|---|---|
| `artifacts/api-server` | `pnpm --filter @workspace/api-server run dev` | API Express |
| `artifacts/daily-tasks-manager` | `pnpm --filter @workspace/daily-tasks-manager run dev` | Web React |
| `artifacts/daily-tasks-mobile` | `pnpm --filter @workspace/daily-tasks-mobile run dev` | Expo |
| `artifacts/mockup-sandbox` | `pnpm --filter @workspace/mockup-sandbox run dev` | معاينة تصميم |

### 11.3 مسارات وفحوص الصحة

- API الحالي:
  - preview: `/api`
  - health: `/healthz`
  - production port: `8080`
- Web الحالي:
  - preview: `/`
  - local port: `24245`
- Mobile:
  - preview: `/daily-tasks-mobile/`
  - health: `/status`
  - local port: `19101`
- Laravel يجب أن يوفر مسار صحة غير محمي مثل `/api/healthz`.

### 11.4 أوامر المشروع الحالي

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```

### 11.5 أوامر Laravel المتوقعة

```bash
cd services/laravel-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan route:list
php artisan test
```

قبل تشغيل الإنتاج يجب ضبط MySQL وClerk من بيئة آمنة، لا من قيم تجريبية داخل
المستودع.

---

## 12. المتطلبات غير الوظيفية

### الأمان

- عزل صارم حسب المالك.
- رفض JWT غير الصالح.
- عدم تسريب بيانات حساب سابق.
- عدم طباعة secrets أو tokens في logs.
- التحقق من ملكية المساحة قبل إنشاء رابط لها.
- التحقق من صلاحية المدير على كل مسار إداري.
- استخدام رسائل أخطاء لا تكشف بنية قاعدة البيانات.

### الأداء

- فهرس على `(owner_id, task_date)` للمهام.
- فهارس `owner_id` للجداول المملوكة.
- عدم تحميل كل تاريخ المستخدم عند عرض يوم واحد.
- عدم إعادة استخدام cache بين حسابين.
- health check سريع ولا يعتمد على استعلامات ثقيلة.

### الاعتمادية

- حالات تحميل واضحة.
- حالات خطأ قابلة لإعادة المحاولة.
- Error boundary للويب والجوال.
- عدم عرض شاشة فارغة عند تبديل الحساب.
- تشغيل migrations قبل تشغيل نسخة Laravel على MySQL.

### قابلية الصيانة

- OpenAPI هو مصدر العقد.
- مخطط Drizzle الحالي يجب أن يطابق PostgreSQL الحالي.
- migrations Laravel يجب أن توثق البنية الهدف.
- عدم خلط كود الواجهة القديمة بالواجهة Vanilla المستهدفة.
- عدم حذف Express أو PostgreSQL قبل اكتمال اختبار الجوال والقطع النهائي.

---

## 13. معايير القبول

### المصادقة

- [ ] يستطيع الزائر الوصول إلى صفحة الدخول دون خطأ.
- [ ] يحصل المستخدم المسجل على بيانات حسابه فقط.
- [ ] يعيد API `401` عند غياب أو فساد token.
- [ ] لا تظهر بيانات الحساب السابق أثناء التبديل.
- [ ] تظهر شاشة انتقال أثناء تحميل الحساب الجديد.

### المهام

- [ ] إنشاء مهمة بتاريخ ومساحة وعنوان.
- [ ] تعديل العنوان والملاحظات والأولوية.
- [ ] حفظ وقت البداية والمدة.
- [ ] مسح وقت البداية والمدة إلى `null`.
- [ ] إكمال المهمة وحذفها.
- [ ] ترتيب المهام بالسحب والإفلات.
- [ ] عدم وجود أزرار تقديم/تأخير.
- [ ] التكرار ينشئ نسخة تالية مرة واحدة فقط.
- [ ] نسخ المهمة إلى عدة تواريخ يمنع التكرار.
- [ ] الملخص يعرض الإجمالي والمكتمل والمتبقي والتوزيع.

### المساحات

- [ ] إنشاء مساحة وتعديلها وحذفها.
- [ ] منع الاسم المكرر داخل الحساب.
- [ ] الحفاظ على المهام عند تغيير نوع الاستخدام.
- [ ] تحديث فئة المهام عند تغيير اسم المساحة.

### الإنتاجية

- [ ] CRUD للأهداف.
- [ ] CRUD للعادات وتحديث streak.
- [ ] CRUD لعناصر الدراسة.
- [ ] CRUD للأحداث مع رفض نطاق تاريخ غير صحيح.
- [ ] CRUD لروابط المساحات.

### لوحة التحكم

- [ ] تغيير رؤية الأقسام وترتيبها.
- [ ] استمرار التفضيلات بعد إعادة التحميل.
- [ ] عرض الإعلانات داخل التطبيق.
- [ ] وصول المدير فقط إلى الإحصائيات وإنشاء الإعلان.

### المهاجرة

- [ ] Laravel يعيد نفس مسارات الـAPI.
- [ ] تطبيق الجوال يعمل دون تعديل على عقد الطلبات.
- [ ] MySQL جديدة وفارغة تعمل عليها migrations.
- [ ] لا توجد قراءة أو كتابة إلى PostgreSQL بعد القطع النهائي.
- [ ] واجهة HTML/JavaScript تغطي وظائف React المطلوبة.

---

## 14. خطة الاختبار

### اختبارات ثابتة

```bash
pnpm run typecheck
pnpm run build
cd services/laravel-api && php artisan test
```

### اختبارات API

1. `GET /api/healthz` دون token → `200`.
2. `GET /api/tasks` دون token → `401`.
3. token صالح للحساب A يرى سجلات A فقط.
4. token صالح للحساب B لا يستطيع قراءة سجل A بمعرفه.
5. محاولة تعديل أو حذف سجل غير مملوك → `404`.
6. المدير يرى `/admin/stats`.
7. مستخدم عادي يحصل على `403` في `/admin/stats`.
8. إنشاء إعلان إداري يظهر في `/notifications`.

### اختبارات التبديل

- تسجيل الدخول بالحساب A.
- تحميل المهام والمساحات.
- تسجيل الخروج أو تبديل الحساب.
- التأكد من عدم ظهور بيانات A خلال الانتقال.
- تسجيل الدخول بالحساب B.
- التأكد من ظهور بيانات B فقط.

### اختبارات الجوال

- تشغيل Expo.
- فتح شاشة اليوم.
- إنشاء وإكمال مهمة.
- قراءة المساحات والأهداف والعادات.
- فحص `/status` في الإنتاج.
- عدم تعديل واجهة الجوال عند استبدال الخادم إلا إذا فشل عقد الاستجابة.

---

## 15. قيود وقرارات يجب عدم كسرها

1. لا تُنقل بيانات PostgreSQL إلى MySQL الجديدة.
2. لا يُعدّل تطبيق الجوال ضمن المهاجرة إلا بطلب صريح أو لإصلاح إعداد نشره.
3. لا تتغير مسارات API أو أسماء JSON دون تحديث جميع العملاء واختبارات التوافق.
4. لا تُستخدم SQLite كحل دائم.
5. لا تُحفظ secrets أو credentials في Git أو ملفات المتطلبات.
6. لا يُسمح للحسابات برؤية بيانات بعضها.
7. أول حساب مصادق عليه يطالب بالبيانات القديمة غير المملوكة مرة واحدة فقط.
8. التاريخ اليومي يخزن كـdate لا كـtimestamp لتجنب انزياح timezone.
9. الروابط داخل المهمة تخزن كعناصر JSON منظمة.
10. لوحات الألوان يجب أن تكمل قيم popover حتى لا تتسرب ألوان سمة أخرى.
11. كل cache يعتمد على الحساب يجب أن يحمل هوية الحساب في مفتاحه أو يتم إنشاؤه
    من جديد عند التبديل.
12. كل artifact قابل للتشغيل يجب أن يملك health path غير محمي يعيد `200`.

---

## 16. الوضع الحالي والفجوات

### منجز

- [x] Express API الحالي يعمل.
- [x] React web الحالي يعمل.
- [x] Expo mobile الحالي يعمل.
- [x] Clerk موجود في الويب والـAPI.
- [x] PostgreSQL/Drizzle schema موجود.
- [x] OpenAPI موجود.
- [x] حقول وقت البداية والمدة والأولوية موجودة.
- [x] حماية cache حسب الحساب موجودة.
- [x] معالجة ألوان popover موجودة.
- [x] مشروع Laravel 13 أُنشئ.
- [x] Laravel migrations الأولية أُنشئت.
- [x] Laravel routes الأساسية أُنشئت.
- [x] Laravel Clerk JWT middleware أُنشئ.
- [x] واجهة HTML/JavaScript أولية للمهام والمساحات أُنشئت.
- [x] لم يتم نقل بيانات PostgreSQL.

### غير مكتمل

- [ ] تطبيق كامل لكل وظائف الواجهة React داخل HTML/JavaScript.
- [ ] اختبار Laravel باستخدام MySQL فعلية.
- [ ] ضبط `CLERK_JWKS_URL` و`CLERK_ISSUER` في بيئة التشغيل المستهدفة.
- [ ] مقارنة كل response من Laravel مع استجابات Express بموجب OpenAPI.
- [ ] اختبار تطبيق الجوال ضد Laravel بدل Express.
- [ ] تحديد الاستضافة النهائية.
- [ ] تشغيل القطع النهائي من Express/PostgreSQL إلى Laravel/MySQL.
- [ ] تحديث وثائق التشغيل الخاصة بـLaravel بدل README القالب الافتراضي.

---

## 17. الملفات المرجعية

### العقد والمخططات

- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/index.ts`
- `lib/db/src/schema/tasks.ts`
- `lib/db/src/schema/spaces.ts`
- `lib/db/src/schema/events.ts`
- `lib/db/src/schema/productivity.ts`
- `lib/db/src/schema/preferences.ts`
- `lib/db/src/schema/users.ts`
- `lib/db/src/schema/space-links.ts`
- `lib/db/src/schema/broadcast-notifications.ts`

### الخادم الحالي

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/middlewares/auth.ts`
- `artifacts/api-server/src/routes/tasks.ts`
- `artifacts/api-server/src/routes/spaces.ts`
- `artifacts/api-server/src/routes/productivity.ts`
- `artifacts/api-server/src/routes/events.ts`
- `artifacts/api-server/src/routes/space-links.ts`
- `artifacts/api-server/src/routes/onboarding.ts`
- `artifacts/api-server/src/routes/preferences.ts`
- `artifacts/api-server/src/routes/notifications.ts`
- `artifacts/api-server/src/routes/admin.ts`

### واجهة الويب الحالية

- `artifacts/daily-tasks-manager/src/App.tsx`
- `artifacts/daily-tasks-manager/src/pages/home.tsx`
- `artifacts/daily-tasks-manager/src/pages/onboarding.tsx`
- `artifacts/daily-tasks-manager/src/pages/admin.tsx`
- `artifacts/daily-tasks-manager/src/components/daily-plan.tsx`
- `artifacts/daily-tasks-manager/src/components/task-card.tsx`
- `artifacts/daily-tasks-manager/src/components/task-form.tsx`
- `artifacts/daily-tasks-manager/src/components/productivity-hub.tsx`
- `artifacts/daily-tasks-manager/src/components/events-section.tsx`
- `artifacts/daily-tasks-manager/src/components/dashboard-customizer.tsx`
- `artifacts/daily-tasks-manager/src/theme-palette.ts`

### تطبيق الجوال

- `artifacts/daily-tasks-mobile/app/_layout.tsx`
- `artifacts/daily-tasks-mobile/app/(tabs)/index.tsx`
- `artifacts/daily-tasks-mobile/server/serve.js`
- `artifacts/daily-tasks-mobile/.replit-artifact/artifact.toml`

### المهاجرة

- `services/laravel-api/routes/api.php`
- `services/laravel-api/app/Http/Controllers/LegacyApiController.php`
- `services/laravel-api/app/Http/Middleware/ClerkAuth.php`
- `services/laravel-api/database/migrations/2026_09_09_000000_create_daily_tasks_tables.php`
- `services/laravel-api/resources/views/app.blade.php`
- `services/laravel-api/public/app.js`
- `services/laravel-api/public/app.css`
- `services/laravel-api/.env.example`
