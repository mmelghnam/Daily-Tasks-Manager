<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="clerk-publishable-key" content="{{ config('services.clerk.publishable_key') }}">
    <title>إنجازك اليومي</title>
    <link rel="stylesheet" href="/app.css">
</head>
<body>
    <main class="shell">
        <header class="topbar">
            <div>
                <p class="eyebrow">إنجازك اليومي</p>
                <h1>خطتك لليوم</h1>
            </div>
            <div class="account-actions">
                <span id="account-name" class="muted">جارٍ التحميل...</span>
                <button id="sign-in" class="button secondary" hidden>تسجيل الدخول</button>
                <button id="sign-out" class="button secondary" hidden>تسجيل الخروج</button>
            </div>
        </header>

        <section id="auth-message" class="notice" hidden>
            سجّل الدخول لعرض مهامك ومساحاتك الخاصة.
        </section>

        <section id="app-content" hidden>
            <div class="toolbar">
                <label>
                    <span>تاريخ اليوم</span>
                    <input id="task-date" type="date">
                </label>
                <button id="refresh" class="button secondary">تحديث</button>
            </div>

            <section class="grid">
                <article class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">المهام</p>
                            <h2 id="task-count">مهام اليوم</h2>
                        </div>
                        <span id="task-summary" class="pill">0 متبقية</span>
                    </div>
                    <form id="task-form" class="task-form">
                        <input id="task-title" type="text" placeholder="ما الذي تريد إنجازه؟" required>
                        <select id="task-category" aria-label="المساحة"></select>
                        <select id="task-priority" aria-label="الأولوية">
                            <option value="high">عالية</option>
                            <option value="medium" selected>متوسطة</option>
                            <option value="low">منخفضة</option>
                        </select>
                        <button class="button primary" type="submit">إضافة</button>
                    </form>
                    <p id="task-error" class="error" role="alert" hidden></p>
                    <div id="task-list" class="task-list"></div>
                </article>

                <aside class="panel side-panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">المساحات</p>
                            <h2>تنظيم يومك</h2>
                        </div>
                    </div>
                    <form id="space-form" class="stack">
                        <input id="space-name" type="text" placeholder="اسم مساحة جديدة" required>
                        <button class="button secondary" type="submit">إضافة مساحة</button>
                    </form>
                    <div id="space-list" class="space-list"></div>
                </aside>
            </section>
        </section>
    </main>
    <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"></script>
    <script src="/app.js" defer></script>
</body>
</html>