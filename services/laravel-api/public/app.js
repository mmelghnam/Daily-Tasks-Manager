(() => {
    const state = { clerk: null, tasks: [], spaces: [], date: new Date().toISOString().slice(0, 10) };
    const $ = (selector) => document.querySelector(selector);

    function show(selector, visible) {
        $(selector).hidden = !visible;
    }

    async function api(path, options = {}) {
        const token = await state.clerk?.session?.getToken?.();
        const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.message || payload.error || `تعذر تنفيذ الطلب (${response.status})`);
        }
        return response.status === 204 ? null : response.json();
    }

    function renderTasks() {
        const list = $('#task-list');
        const remaining = state.tasks.filter((task) => !task.completed).length;
        $('#task-count').textContent = `${state.tasks.length} ${state.tasks.length === 1 ? 'مهمة' : 'مهام'} اليوم`;
        $('#task-summary').textContent = `${remaining} متبقية`;
        list.replaceChildren();
        if (!state.tasks.length) {
            list.innerHTML = '<div class="empty">لا توجد مهام لهذا اليوم بعد.</div>';
            return;
        }
        state.tasks.forEach((task) => {
            const card = document.createElement('article');
            card.className = `task-card${task.completed ? ' done' : ''}`;
            card.innerHTML = `
                <input class="check" type="checkbox" ${task.completed ? 'checked' : ''} aria-label="تحديد المهمة كمكتملة">
                <div>
                    <div class="task-title"></div>
                    <div class="task-meta">
                        <span>${escapeHtml(task.category)}</span>
                        <span class="priority-${escapeHtml(task.priority || 'medium')}">${priorityLabel(task.priority)}</span>
                        ${task.startTime ? `<span>${escapeHtml(task.startTime)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="icon-button delete" type="button" aria-label="حذف المهمة">حذف</button>
                </div>
            `;
            card.querySelector('.task-title').textContent = task.title;
            card.querySelector('.check').addEventListener('change', () => updateTask(task.id, { completed: card.querySelector('.check').checked }));
            card.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));
            list.append(card);
        });
    }

    function renderSpaces() {
        const list = $('#space-list');
        const category = $('#task-category');
        list.replaceChildren();
        category.replaceChildren();
        if (!state.spaces.length) {
            list.innerHTML = '<div class="empty">أضف أول مساحة لتنظيم مهامك.</div>';
            const option = new Option('مساحة عامة', 'عام');
            category.append(option);
            return;
        }
        state.spaces.forEach((space) => {
            const item = document.createElement('div');
            item.className = 'space-item';
            item.innerHTML = `<span><i class="space-dot"></i>${escapeHtml(space.name)}</span>`;
            list.append(item);
            category.append(new Option(space.name, space.name));
        });
    }

    function priorityLabel(priority) {
        return ({ high: 'أولوية عالية', medium: 'أولوية متوسطة', low: 'أولوية منخفضة' })[priority] || 'أولوية متوسطة';
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }

    async function load() {
        try {
            [state.spaces, state.tasks] = await Promise.all([
                api('/spaces'),
                api(`/tasks?date=${encodeURIComponent(state.date)}`),
            ]);
            renderSpaces();
            renderTasks();
            $('#task-error').hidden = true;
        } catch (error) {
            $('#task-error').textContent = error.message;
            $('#task-error').hidden = false;
        }
    }

    async function updateTask(id, patch) {
        try {
            await api(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
            await load();
        } catch (error) {
            $('#task-error').textContent = error.message;
            $('#task-error').hidden = false;
        }
    }

    async function deleteTask(id) {
        if (!window.confirm('هل تريد حذف هذه المهمة؟')) return;
        await api(`/tasks/${id}`, { method: 'DELETE' });
        await load();
    }

    async function start() {
        const key = $('meta[name="clerk-publishable-key"]').content;
        if (!key || !window.Clerk) {
            $('#account-name').textContent = 'تحتاج إعداد Clerk';
            show('#auth-message', true);
            return;
        }
        state.clerk = new window.Clerk(key);
        await state.clerk.load();
        state.clerk.addListener(({ session }) => {
            const signedIn = Boolean(session);
            show('#auth-message', !signedIn);
            show('#app-content', signedIn);
            show('#sign-in', !signedIn);
            show('#sign-out', signedIn);
            $('#account-name').textContent = signedIn ? (state.clerk.user?.firstName || 'الحساب') : 'غير مسجل';
            if (signedIn) load();
        });
        const signedIn = Boolean(state.clerk.session);
        show('#auth-message', !signedIn);
        show('#app-content', signedIn);
        show('#sign-in', !signedIn);
        show('#sign-out', signedIn);
        $('#account-name').textContent = signedIn ? (state.clerk.user?.firstName || 'الحساب') : 'غير مسجل';
        if (signedIn) load();
    }

    $('#task-date').value = state.date;
    $('#task-date').addEventListener('change', (event) => { state.date = event.target.value; load(); });
    $('#refresh').addEventListener('click', load);
    $('#sign-in').addEventListener('click', () => state.clerk.openSignIn());
    $('#sign-out').addEventListener('click', () => state.clerk.signOut());
    $('#task-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = $('#task-title').value.trim();
        if (!title) return;
        await api('/tasks', {
            method: 'POST',
            body: JSON.stringify({
                taskDate: state.date,
                title,
                category: $('#task-category').value || 'عام',
                priority: $('#task-priority').value,
            }),
        });
        event.target.reset();
        await load();
    });
    $('#space-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = $('#space-name').value.trim();
        if (!name) return;
        await api('/spaces', { method: 'POST', body: JSON.stringify({ name }) });
        event.target.reset();
        await load();
    });
    start().catch((error) => {
        $('#account-name').textContent = error.message;
        show('#auth-message', true);
    });
})();