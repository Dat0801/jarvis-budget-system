<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->index(['user_id', 'spent_at'], 'expenses_user_spent_at_index');
            $table->index(['user_id', 'created_at'], 'expenses_user_created_at_index');
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->index(['user_id', 'received_at'], 'incomes_user_received_at_index');
            $table->index(['user_id', 'created_at'], 'incomes_user_created_at_index');
        });

        Schema::table('notes', function (Blueprint $table) {
            $table->index(['user_id', 'is_completed', 'reminder_date'], 'notes_user_completed_reminder_index');
            $table->index(['user_id', 'created_at'], 'notes_user_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropIndex('notes_user_created_at_index');
            $table->dropIndex('notes_user_completed_reminder_index');
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->dropIndex('incomes_user_created_at_index');
            $table->dropIndex('incomes_user_received_at_index');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex('expenses_user_created_at_index');
            $table->dropIndex('expenses_user_spent_at_index');
        });
    }
};
