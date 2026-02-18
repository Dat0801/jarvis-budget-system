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
            $table->string('category')->nullable()->after('name');
            $table->date('budget_date')->nullable()->after('color');
            $table->boolean('repeat_this_budget')->default(false)->after('budget_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jars', function (Blueprint $table) {
            $table->dropColumn(['category', 'budget_date', 'repeat_this_budget']);
        });
    }
};
