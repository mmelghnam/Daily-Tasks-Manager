<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LegacyApiController extends Controller
{
    public function health(): JsonResponse
    {
        return response()->json(['status' => 'ok']);
    }

    public function tasks(Request $request): JsonResponse
    {
        $ownerId = $request->attributes->get('userId');
        $date = $request->query('date');
        $dateFrom = $request->query('dateFrom');
        $dateTo = $request->query('dateTo');

        $query = DB::table('daily_tasks')
            ->where('owner_id', $ownerId)
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($date) {
            $query->where('task_date', $date);
        } elseif ($dateFrom || $dateTo) {
            if ($dateFrom) {
                $query->where('task_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $query->where('task_date', '<=', $dateTo);
            }
        }

        return response()->json($query->get()->map(fn ($task) => $this->resource($task)));
    }

    public function createTask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'taskDate' => ['required', 'date'],
            'category' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'priority' => ['nullable', 'string', 'max:32'],
            'sortOrder' => ['nullable', 'integer'],
            'startTime' => ['nullable', 'string', 'max:16'],
            'durationMinutes' => ['nullable', 'integer', 'min:0'],
            'recurrence' => ['nullable', 'string', 'max:64'],
            'dueDate' => ['nullable', 'date'],
            'subtasks' => ['nullable', 'array'],
            'links' => ['nullable', 'array'],
            'followUps' => ['nullable', 'array'],
            'completed' => ['nullable', 'boolean'],
        ]);

        $id = DB::table('daily_tasks')->insertGetId([
            'task_date' => $data['taskDate'],
            'owner_id' => $request->attributes->get('userId'),
            'category' => $data['category'],
            'title' => $data['title'],
            'notes' => $data['notes'] ?? null,
            'priority' => $data['priority'] ?? 'medium',
            'sort_order' => $data['sortOrder'] ?? 0,
            'start_time' => $data['startTime'] ?? null,
            'duration_minutes' => $data['durationMinutes'] ?? null,
            'recurrence' => $data['recurrence'] ?? null,
            'due_date' => $data['dueDate'] ?? null,
            'subtasks' => json_encode($data['subtasks'] ?? []),
            'completed' => $data['completed'] ?? false,
            'links' => json_encode($data['links'] ?? []),
            'follow_ups' => json_encode($data['followUps'] ?? []),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($this->decodeJsonColumns(
            DB::table('daily_tasks')->where('id', $id)->first()
        ), 201);
    }

    public function updateTask(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'taskDate' => ['sometimes', 'nullable', 'date'],
            'category' => ['sometimes', 'string', 'max:255'],
            'title' => ['sometimes', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'priority' => ['sometimes', 'string', 'max:32'],
            'sortOrder' => ['sometimes', 'integer'],
            'startTime' => ['sometimes', 'nullable', 'string', 'max:16'],
            'durationMinutes' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'recurrence' => ['sometimes', 'nullable', 'string', 'max:64'],
            'dueDate' => ['sometimes', 'nullable', 'date'],
            'subtasks' => ['sometimes', 'array'],
            'links' => ['sometimes', 'array'],
            'followUps' => ['sometimes', 'array'],
            'completed' => ['sometimes', 'boolean'],
        ]);

        $columnMap = [
            'taskDate' => 'task_date',
            'sortOrder' => 'sort_order',
            'startTime' => 'start_time',
            'durationMinutes' => 'duration_minutes',
            'dueDate' => 'due_date',
            'followUps' => 'follow_ups',
        ];
        $updates = [];
        foreach ($data as $key => $value) {
            $column = $columnMap[$key] ?? \Illuminate\Support\Str::snake($key);
            $updates[$column] = in_array($key, ['subtasks', 'links', 'followUps'], true)
                ? json_encode($value)
                : $value;
        }
        $updates['updated_at'] = now();

        $updated = DB::table('daily_tasks')
            ->where('id', $id)
            ->where('owner_id', $request->attributes->get('userId'))
            ->update($updates);

        if (!$updated) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        return response()->json($this->decodeJsonColumns(
            DB::table('daily_tasks')->where('id', $id)->first()
        ));
    }

    public function deleteTask(Request $request, int $id): JsonResponse
    {
        $deleted = DB::table('daily_tasks')
            ->where('id', $id)
            ->where('owner_id', $request->attributes->get('userId'))
            ->delete();

        return $deleted
            ? response()->json(null, 204)
            : response()->json(['message' => 'Task not found.'], 404);
    }

    public function taskSummary(Request $request): JsonResponse
    {
        $query = DB::table('daily_tasks')
            ->where('owner_id', $request->attributes->get('userId'));
        $this->applyDateFilters($query, $request);
        $rows = $query->get(['category', 'completed']);
        $spaces = DB::table('task_spaces')
            ->where('owner_id', $request->attributes->get('userId'))
            ->orderBy('created_at')
            ->orderBy('id')
            ->pluck('name');
        $byCategory = [];
        foreach ($spaces as $space) {
            $byCategory[$space] = 0;
        }
        $completed = 0;
        foreach ($rows as $row) {
            $byCategory[$row->category] = ($byCategory[$row->category] ?? 0) + 1;
            $completed += (int) $row->completed;
        }

        return response()->json([
            'total' => $rows->count(),
            'completed' => $completed,
            'remaining' => $rows->count() - $completed,
            'byCategory' => $byCategory,
        ]);
    }

    public function copyTask(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'dates' => ['required', 'array', 'min:1'],
            'dates.*' => ['date'],
        ]);
        $source = DB::table('daily_tasks')
            ->where('id', $id)
            ->where('owner_id', $request->attributes->get('userId'))
            ->first();
        if (!$source) {
            return response()->json(['error' => 'Task not found'], 404);
        }

        $copies = [];
        foreach (array_unique($data['dates']) as $taskDate) {
            $exists = DB::table('daily_tasks')->where([
                'owner_id' => $source->owner_id,
                'task_date' => $taskDate,
                'category' => $source->category,
                'title' => $source->title,
            ])->exists();
            if ($exists) {
                continue;
            }
            $sortOrder = (int) (DB::table('daily_tasks')
                ->where('owner_id', $source->owner_id)
                ->where('task_date', $taskDate)
                ->where('category', $source->category)
                ->max('sort_order') ?? -1) + 1;
            $copyId = DB::table('daily_tasks')->insertGetId([
                'task_date' => $taskDate,
                'owner_id' => $source->owner_id,
                'category' => $source->category,
                'title' => $source->title,
                'notes' => $source->notes,
                'priority' => $source->priority,
                'sort_order' => $sortOrder,
                'start_time' => $source->start_time,
                'duration_minutes' => $source->duration_minutes,
                'recurrence' => $source->recurrence,
                'due_date' => $source->due_date,
                'subtasks' => $this->resetCompletedJson($source->subtasks),
                'completed' => false,
                'links' => $source->links,
                'follow_ups' => $this->resetCompletedJson($source->follow_ups),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $copies[] = $this->resource(DB::table('daily_tasks')->where('id', $copyId)->first());
        }

        return response()->json($copies, 201);
    }

    public function onboarding(Request $request): JsonResponse
    {
        $user = DB::table('app_users')
            ->where('user_id', $request->attributes->get('userId'))
            ->first();

        return response()->json([
            'completed' => (bool) ($user?->onboarded_at),
            'usageType' => $user?->usage_type,
        ]);
    }

    public function completeOnboarding(Request $request): JsonResponse
    {
        $data = $request->validate([
            'usageType' => ['required', 'in:student,employee,freelancer,personal'],
            'taskDate' => ['required', 'date'],
        ]);
        $userId = $request->attributes->get('userId');
        $completed = false;

        DB::transaction(function () use ($data, $userId, &$completed): void {
            $updated = DB::table('app_users')
                ->where('user_id', $userId)
                ->whereNull('onboarded_at')
                ->update([
                    'usage_type' => $data['usageType'],
                    'onboarded_at' => now(),
                ]);
            if (!$updated) {
                return;
            }
            $templates = $this->onboardingTemplates()[$data['usageType']];
            foreach ($templates['spaces'] as [$name, $color, $description]) {
                DB::table('task_spaces')->insertOrIgnore([
                    'owner_id' => $userId,
                    'name' => $name,
                    'color' => $color,
                    'description' => $description,
                    'created_at' => now(),
                ]);
            }
            foreach ($templates['tasks'] as [$category, $title]) {
                DB::table('daily_tasks')->insert([
                    'owner_id' => $userId,
                    'task_date' => $data['taskDate'],
                    'category' => $category,
                    'title' => $title,
                    'priority' => 'medium',
                    'sort_order' => 0,
                    'subtasks' => '[]',
                    'completed' => false,
                    'links' => '[]',
                    'follow_ups' => '[]',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $completed = true;
        });

        $user = DB::table('app_users')->where('user_id', $userId)->first();
        return response()->json([
            'completed' => $completed || (bool) ($user?->onboarded_at),
            'usageType' => $user?->usage_type,
        ]);
    }

    public function updateUsageType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'usageType' => ['required', 'in:student,employee,freelancer,personal'],
        ]);
        DB::table('app_users')
            ->where('user_id', $request->attributes->get('userId'))
            ->update(['usage_type' => $data['usageType']]);
        $user = DB::table('app_users')->where('user_id', $request->attributes->get('userId'))->first();

        return response()->json([
            'completed' => (bool) ($user?->onboarded_at),
            'usageType' => $user?->usage_type,
        ]);
    }

    public function dashboardPreferences(Request $request): JsonResponse
    {
        $row = DB::table('dashboard_preferences')
            ->where('owner_id', $request->attributes->get('userId'))
            ->first();
        return response()->json($row ? $this->resource($row) : [
            'visibleSections' => ['summary', 'events', 'productivity', 'links', 'notifications', 'taskMap'],
            'sectionOrder' => ['summary', 'events', 'productivity', 'links', 'notifications', 'taskMap'],
        ]);
    }

    public function updateDashboardPreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visibleSections' => ['required', 'array'],
            'sectionOrder' => ['required', 'array'],
        ]);
        DB::table('dashboard_preferences')->updateOrInsert(
            ['owner_id' => $request->attributes->get('userId')],
            [
                'visible_sections' => json_encode($data['visibleSections']),
                'section_order' => json_encode($data['sectionOrder']),
                'updated_at' => now(),
            ],
        );
        return $this->dashboardPreferences($request);
    }

    public function notifications(Request $request): JsonResponse
    {
        return response()->json(DB::table('broadcast_notifications')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($row) => $this->resource($row)));
    }

    public function goals(Request $request): JsonResponse
    {
        return $this->ownedList('goals', $request);
    }

    public function createGoal(Request $request): JsonResponse
    {
        return $this->createOwned('goals', $request, [
            'title' => ['required', 'string', 'max:255'],
            'target' => ['nullable', 'integer', 'min:1'],
            'current' => ['nullable', 'integer', 'min:0'],
            'deadline' => ['nullable', 'date'],
            'completed' => ['nullable', 'boolean'],
        ]);
    }

    public function updateGoal(Request $request, int $id): JsonResponse
    {
        return $this->updateOwned('goals', $request, $id, [
            'title' => ['sometimes', 'string', 'max:255'],
            'target' => ['sometimes', 'integer', 'min:1'],
            'current' => ['sometimes', 'integer', 'min:0'],
            'deadline' => ['sometimes', 'nullable', 'date'],
            'completed' => ['sometimes', 'boolean'],
        ]);
    }

    public function deleteGoal(Request $request, int $id): JsonResponse
    {
        return $this->deleteOwned('goals', $request, $id);
    }

    public function habits(Request $request): JsonResponse
    {
        return $this->ownedList('habits', $request);
    }

    public function createHabit(Request $request): JsonResponse
    {
        return $this->createOwned('habits', $request, [
            'name' => ['required', 'string', 'max:255'],
            'frequency' => ['nullable', 'string', 'max:32'],
            'streak' => ['nullable', 'integer', 'min:0'],
            'lastCompleted' => ['nullable', 'date'],
        ], ['created_at' => now()]);
    }

    public function updateHabit(Request $request, int $id): JsonResponse
    {
        return $this->updateOwned('habits', $request, $id, [
            'name' => ['sometimes', 'string', 'max:255'],
            'frequency' => ['sometimes', 'string', 'max:32'],
            'streak' => ['sometimes', 'integer', 'min:0'],
            'lastCompleted' => ['sometimes', 'nullable', 'date'],
        ]);
    }

    public function deleteHabit(Request $request, int $id): JsonResponse
    {
        return $this->deleteOwned('habits', $request, $id);
    }

    public function studyItems(Request $request): JsonResponse
    {
        return $this->ownedList('study_items', $request);
    }

    public function createStudyItem(Request $request): JsonResponse
    {
        return $this->createOwned('study_items', $request, [
            'kind' => ['nullable', 'string', 'max:32'],
            'title' => ['required', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'itemDate' => ['nullable', 'date'],
            'completed' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ], ['created_at' => now()]);
    }

    public function updateStudyItem(Request $request, int $id): JsonResponse
    {
        return $this->updateOwned('study_items', $request, $id, [
            'kind' => ['sometimes', 'string', 'max:32'],
            'title' => ['sometimes', 'string', 'max:255'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:255'],
            'itemDate' => ['sometimes', 'nullable', 'date'],
            'completed' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
    }

    public function deleteStudyItem(Request $request, int $id): JsonResponse
    {
        return $this->deleteOwned('study_items', $request, $id);
    }

    public function spaces(Request $request): JsonResponse
    {
        return $this->ownedList('task_spaces', $request);
    }

    public function createSpace(Request $request): JsonResponse
    {
        return $this->createOwned('task_spaces', $request, [
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:32'],
            'description' => ['nullable', 'string'],
        ], ['created_at' => now()]);
    }

    public function updateSpace(Request $request, int $id): JsonResponse
    {
        return $this->updateOwned('task_spaces', $request, $id, [
            'name' => ['sometimes', 'string', 'max:255'],
            'color' => ['sometimes', 'string', 'max:32'],
            'description' => ['sometimes', 'nullable', 'string'],
        ]);
    }

    public function deleteSpace(Request $request, int $id): JsonResponse
    {
        return $this->deleteOwned('task_spaces', $request, $id);
    }

    public function spaceLinks(Request $request): JsonResponse
    {
        return $this->ownedList('space_links', $request);
    }

    public function createSpaceLink(Request $request): JsonResponse
    {
        $data = $request->validate([
            'spaceId' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'url' => ['required', 'url', 'max:2048'],
        ]);
        $spaceExists = DB::table('task_spaces')
            ->where('id', $data['spaceId'])
            ->where('owner_id', $request->attributes->get('userId'))
            ->exists();
        if (!$spaceExists) {
            return response()->json(['message' => 'Space not found.'], 404);
        }

        $id = DB::table('space_links')->insertGetId([
            'owner_id' => $request->attributes->get('userId'),
            'space_id' => $data['spaceId'],
            'title' => $data['title'],
            'url' => $data['url'],
            'created_at' => now(),
        ]);
        return response()->json($this->resource(DB::table('space_links')->where('id', $id)->first()), 201);
    }

    public function deleteSpaceLink(Request $request, int $id): JsonResponse
    {
        return $this->deleteOwned('space_links', $request, $id);
    }

    public function events(Request $request): JsonResponse
    {
        return $this->ownedList('countdown_events', $request);
    }

    public function createEvent(Request $request): JsonResponse
    {
        return $this->createOwned('countdown_events', $request, [
            'title' => ['required', 'string', 'max:255'],
            'startDate' => ['required', 'date'],
            'endDate' => ['required', 'date'],
            'color' => ['nullable', 'string', 'max:32'],
            'imageUrl' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ], ['created_at' => now()]);
    }

    public function updateEvent(Request $request, int $id): JsonResponse
    {
        return $this->updateOwned('countdown_events', $request, $id, [
            'title' => ['sometimes', 'string', 'max:255'],
            'startDate' => ['sometimes', 'date'],
            'endDate' => ['sometimes', 'date'],
            'color' => ['sometimes', 'string', 'max:32'],
            'imageUrl' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ]);
    }

    public function deleteEvent(Request $request, int $id): JsonResponse
    {
        return $this->deleteOwned('countdown_events', $request, $id);
    }

    public function adminAccess(Request $request): JsonResponse
    {
        return response()->json(['isAdmin' => $this->isAdmin($request)]);
    }

    public function adminStats(Request $request): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $taskCount = DB::table('daily_tasks')->count();
        $completedCount = DB::table('daily_tasks')->where('completed', true)->count();
        $activeUsers = DB::table('daily_tasks')
            ->whereNotNull('owner_id')
            ->where('created_at', '>=', now()->subDays(30))
            ->distinct('owner_id')
            ->count('owner_id');
        $usageTypes = DB::table('app_users')
            ->whereNotNull('usage_type')
            ->select('usage_type', DB::raw('COUNT(*) as value'))
            ->groupBy('usage_type')
            ->pluck('value', 'usage_type')
            ->map(fn ($value) => (int) $value)
            ->all();

        return response()->json([
            'users' => DB::table('app_users')->count(),
            'tasks' => $taskCount,
            'completedTasks' => $completedCount,
            'spaces' => DB::table('task_spaces')->count(),
            'goals' => DB::table('goals')->count(),
            'habits' => DB::table('habits')->count(),
            'activeUsers30d' => $activeUsers,
            'completionRate' => $taskCount ? (int) round($completedCount / $taskCount * 100) : 0,
            'usageTypes' => $usageTypes,
        ]);
    }

    public function createAdminNotification(Request $request): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ]);
        $id = (string) \Illuminate\Support\Str::uuid();
        DB::table('broadcast_notifications')->insert([
            'id' => $id,
            'title' => trim($data['title']),
            'body' => trim($data['body']),
            'created_by' => $request->attributes->get('userId'),
            'created_at' => now(),
        ]);
        return response()->json($this->resource(
            DB::table('broadcast_notifications')->where('id', $id)->first()
        ), 201);
    }

    private function ownedList(string $table, Request $request): JsonResponse
    {
        $rows = DB::table($table)
            ->where('owner_id', $request->attributes->get('userId'))
            ->orderBy('id')
            ->get();
        return response()->json($rows->map(fn ($row) => $this->resource($row)));
    }

    private function createOwned(
        string $table,
        Request $request,
        array $rules,
        array $defaults = [],
    ): JsonResponse {
        $data = $request->validate($rules);
        $row = array_merge(
            ['owner_id' => $request->attributes->get('userId')],
            $this->databaseFields($data),
            $defaults,
        );
        if (in_array($table, ['goals', 'habits', 'study_items'], true)) {
            $row['created_at'] ??= now();
        }
        $id = DB::table($table)->insertGetId($row);
        return response()->json($this->resource(DB::table($table)->where('id', $id)->first()), 201);
    }

    private function updateOwned(string $table, Request $request, int $id, array $rules): JsonResponse
    {
        $data = $request->validate($rules);
        $updates = $this->databaseFields($data);
        if (in_array($table, ['goals', 'daily_tasks'], true)) {
            $updates['updated_at'] = now();
        }
        $updated = DB::table($table)
            ->where('id', $id)
            ->where('owner_id', $request->attributes->get('userId'))
            ->update($updates);
        if (!$updated) {
            return response()->json(['error' => 'Resource not found'], 404);
        }
        return response()->json($this->resource(DB::table($table)->where('id', $id)->first()));
    }

    private function deleteOwned(string $table, Request $request, int $id): JsonResponse
    {
        $deleted = DB::table($table)
            ->where('id', $id)
            ->where('owner_id', $request->attributes->get('userId'))
            ->delete();
        return $deleted
            ? response()->json(null, 204)
            : response()->json(['error' => 'Resource not found'], 404);
    }

    private function databaseFields(array $data): array
    {
        $jsonFields = ['subtasks', 'links', 'followUps', 'visibleSections', 'sectionOrder'];
        $mapped = [];
        foreach ($data as $key => $value) {
            $column = \Illuminate\Support\Str::snake($key);
            $mapped[$column] = in_array($key, $jsonFields, true)
                ? json_encode($value)
                : $value;
        }
        return $mapped;
    }

    private function resource(?object $row): ?array
    {
        if (!$row) {
            return null;
        }

        $data = (array) $row;
        foreach (['subtasks', 'links', 'follow_ups', 'visible_sections', 'section_order'] as $column) {
            if (isset($data[$column]) && is_string($data[$column])) {
                $data[$column] = json_decode($data[$column], true) ?? [];
            }
        }

        $result = [];
        foreach ($data as $key => $value) {
            $camel = \Illuminate\Support\Str::camel($key);
            if (in_array($key, ['created_at', 'updated_at'], true) && $value) {
                $value = \Illuminate\Support\Carbon::parse($value)->toISOString();
            }
            $result[$camel] = $value;
        }
        return $result;
    }

    private function applyDateFilters($query, Request $request): void
    {
        if ($request->query('date')) {
            $query->where('task_date', $request->query('date'));
            return;
        }
        if ($request->query('dateFrom')) {
            $query->where('task_date', '>=', $request->query('dateFrom'));
        }
        if ($request->query('dateTo')) {
            $query->where('task_date', '<=', $request->query('dateTo'));
        }
    }

    private function isAdmin(Request $request): bool
    {
        $userId = $request->attributes->get('userId');
        $configured = trim((string) env('ADMIN_USER_ID', ''));
        if ($configured !== '') {
            return $configured === $userId;
        }
        return DB::table('app_users')->orderBy('created_at')->orderBy('user_id')->value('user_id') === $userId;
    }

    private function resetCompletedJson(?string $value): string
    {
        $items = json_decode($value ?: '[]', true) ?? [];
        return json_encode(array_map(function (array $item): array {
            $item['completed'] = false;
            return $item;
        }, $items));
    }

    private function onboardingTemplates(): array
    {
        return [
            'student' => [
                'spaces' => [
                    ['الدراسة', '#2e8d77', 'المحاضرات والمراجعة'],
                    ['الواجبات', '#d39a2f', 'التكاليف ومواعيد التسليم'],
                    ['الحياة', '#6678bd', 'ما يحافظ على توازنك'],
                ],
                'tasks' => [
                    ['الدراسة', 'راجع أهم درس اليوم'],
                    ['الواجبات', 'حدّد أقرب موعد تسليم'],
                    ['الحياة', 'خصص وقتاً للراحة'],
                ],
            ],
            'employee' => [
                'spaces' => [
                    ['العمل', '#2e8d77', 'أولويات ومسؤوليات اليوم'],
                    ['الاجتماعات', '#d39a2f', 'التحضير والمتابعة'],
                    ['التطوير', '#6678bd', 'مهارات ونمو مهني'],
                ],
                'tasks' => [
                    ['العمل', 'حدّد أهم نتيجة لليوم'],
                    ['الاجتماعات', 'راجع اجتماعات اليوم'],
                    ['التطوير', 'خصص وقتاً لتطوير مهارة'],
                ],
            ],
            'freelancer' => [
                'spaces' => [
                    ['العملاء', '#2e8d77', 'تسليمات وتواصل العملاء'],
                    ['المشاريع', '#d39a2f', 'العمل العميق الجاري'],
                    ['الإدارة', '#c97768', 'عروض وفواتير وتنظيم'],
                ],
                'tasks' => [
                    ['العملاء', 'تابع أهم رسالة من عميل'],
                    ['المشاريع', 'أنجز خطوة تسليم واضحة'],
                    ['الإدارة', 'راجع أعمالك الإدارية'],
                ],
            ],
            'personal' => [
                'spaces' => [
                    ['أولوياتي', '#2e8d77', 'ما يستحق تركيزك اليوم'],
                    ['المنزل', '#d39a2f', 'شؤون البيت والعائلة'],
                    ['العافية', '#77964d', 'صحتك وراحتك'],
                ],
                'tasks' => [
                    ['أولوياتي', 'اختر أهم خطوة لليوم'],
                    ['المنزل', 'أنجز أمراً منزلياً صغيراً'],
                    ['العافية', 'خصص وقتاً لنفسك'],
                ],
            ],
        ];
    }

    private function decodeJsonColumns(?object $row): ?array
    {
        return $this->resource($row);
    }
}