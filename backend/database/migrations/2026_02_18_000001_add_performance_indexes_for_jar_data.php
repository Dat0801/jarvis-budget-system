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
        Schema::table('jars', function (Blueprint $table) {
            $table->index(['user_id', 'created_at'], 'jars_user_created_at_index');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->index(['jar_id', 'spent_at'], 'expenses_jar_spent_at_index');
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->index(['jar_id', 'received_at'], 'incomes_jar_received_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incomes', function (Blueprint $table) {
            $table->dropIndex('incomes_jar_received_at_index');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex('expenses_jar_spent_at_index');
        });

        Schema::table('jars', function (Blueprint $table) {
            $table->dropIndex('jars_user_created_at_index');
        });
    }
};
