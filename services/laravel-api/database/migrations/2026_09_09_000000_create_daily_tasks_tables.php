<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_users', function (Blueprint $table): void {
            $table->string('user_id')->primary();
            $table->string('usage_type')->nullable();
            $table->timestamp('onboarded_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('app_settings', function (Blueprint $table): void {
            $table->string('key')->primary();
            $table->text('value');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('task_spaces', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_id')->nullable();
            $table->string('name');
            $table->string('color')->default('#2e8d77');
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['owner_id', 'name']);
            $table->index('owner_id');
        });

        Schema::create('daily_tasks', function (Blueprint $table): void {
            $table->id();
            $table->date('task_date');
            $table->string('owner_id')->nullable();
            $table->string('category');
            $table->string('title');
            $table->text('notes')->nullable();
            $table->string('priority')->default('medium');
            $table->integer('sort_order')->default(0);
            $table->string('start_time')->nullable();
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->string('recurrence')->nullable();
            $table->date('due_date')->nullable();
            $table->json('subtasks');
            $table->boolean('completed')->default(false);
            $table->json('links');
            $table->json('follow_ups');
            $table->timestamps();
            $table->index(['owner_id', 'task_date']);
        });

        Schema::create('goals', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_id');
            $table->string('title');
            $table->unsignedInteger('target')->default(1);
            $table->unsignedInteger('current')->default(0);
            $table->date('deadline')->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamps();
            $table->index('owner_id');
        });

        Schema::create('habits', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_id');
            $table->string('name');
            $table->string('frequency')->default('daily');
            $table->unsignedInteger('streak')->default(0);
            $table->date('last_completed')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('owner_id');
        });

        Schema::create('study_items', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_id');
            $table->string('kind')->default('subject');
            $table->string('title');
            $table->string('subject')->nullable();
            $table->date('item_date')->nullable();
            $table->boolean('completed')->default(false);
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['owner_id', 'item_date']);
        });

        Schema::create('dashboard_preferences', function (Blueprint $table): void {
            $table->string('owner_id')->primary();
            $table->json('visible_sections');
            $table->json('section_order');
            $table->timestamp('updated_at')->useCurrent();
        });

        Schema::create('space_links', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_id')->nullable();
            $table->foreignId('space_id')->constrained('task_spaces')->cascadeOnDelete();
            $table->string('title');
            $table->text('url');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('countdown_events', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_id')->nullable();
            $table->string('title');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('color')->default('#d39a2f');
            $table->text('image_url')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('broadcast_notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('body');
            $table->string('created_by');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcast_notifications');
        Schema::dropIfExists('countdown_events');
        Schema::dropIfExists('space_links');
        Schema::dropIfExists('dashboard_preferences');
        Schema::dropIfExists('study_items');
        Schema::dropIfExists('habits');
        Schema::dropIfExists('goals');
        Schema::dropIfExists('daily_tasks');
        Schema::dropIfExists('task_spaces');
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('app_users');
    }
};