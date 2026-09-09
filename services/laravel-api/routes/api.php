<?php

use App\Http\Controllers\LegacyApiController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LegacyApiController::class, 'health']);
Route::get('/healthz', [LegacyApiController::class, 'health']);

Route::middleware('clerk.auth')->group(function (): void {
    Route::get('/onboarding', [LegacyApiController::class, 'onboarding']);
    Route::post('/onboarding', [LegacyApiController::class, 'completeOnboarding']);
    Route::patch('/onboarding', [LegacyApiController::class, 'updateUsageType']);

    Route::get('/tasks', [LegacyApiController::class, 'tasks']);
    Route::post('/tasks', [LegacyApiController::class, 'createTask']);
    Route::patch('/tasks/{id}', [LegacyApiController::class, 'updateTask']);
    Route::delete('/tasks/{id}', [LegacyApiController::class, 'deleteTask']);
    Route::post('/tasks/{id}/copy', [LegacyApiController::class, 'copyTask']);
    Route::get('/tasks/summary', [LegacyApiController::class, 'taskSummary']);

    Route::get('/preferences/dashboard', [LegacyApiController::class, 'dashboardPreferences']);
    Route::patch('/preferences/dashboard', [LegacyApiController::class, 'updateDashboardPreferences']);
    Route::get('/notifications', [LegacyApiController::class, 'notifications']);

    Route::get('/goals', [LegacyApiController::class, 'goals']);
    Route::post('/goals', [LegacyApiController::class, 'createGoal']);
    Route::patch('/goals/{id}', [LegacyApiController::class, 'updateGoal']);
    Route::delete('/goals/{id}', [LegacyApiController::class, 'deleteGoal']);

    Route::get('/habits', [LegacyApiController::class, 'habits']);
    Route::post('/habits', [LegacyApiController::class, 'createHabit']);
    Route::patch('/habits/{id}', [LegacyApiController::class, 'updateHabit']);
    Route::delete('/habits/{id}', [LegacyApiController::class, 'deleteHabit']);

    Route::get('/study-items', [LegacyApiController::class, 'studyItems']);
    Route::post('/study-items', [LegacyApiController::class, 'createStudyItem']);
    Route::patch('/study-items/{id}', [LegacyApiController::class, 'updateStudyItem']);
    Route::delete('/study-items/{id}', [LegacyApiController::class, 'deleteStudyItem']);

    Route::get('/spaces', [LegacyApiController::class, 'spaces']);
    Route::post('/spaces', [LegacyApiController::class, 'createSpace']);
    Route::patch('/spaces/{id}', [LegacyApiController::class, 'updateSpace']);
    Route::delete('/spaces/{id}', [LegacyApiController::class, 'deleteSpace']);

    Route::get('/space-links', [LegacyApiController::class, 'spaceLinks']);
    Route::post('/space-links', [LegacyApiController::class, 'createSpaceLink']);
    Route::delete('/space-links/{id}', [LegacyApiController::class, 'deleteSpaceLink']);

    Route::get('/events', [LegacyApiController::class, 'events']);
    Route::post('/events', [LegacyApiController::class, 'createEvent']);
    Route::patch('/events/{id}', [LegacyApiController::class, 'updateEvent']);
    Route::delete('/events/{id}', [LegacyApiController::class, 'deleteEvent']);

    Route::get('/admin/access', [LegacyApiController::class, 'adminAccess']);
    Route::get('/admin/stats', [LegacyApiController::class, 'adminStats']);
    Route::post('/admin/notifications', [LegacyApiController::class, 'createAdminNotification']);
});