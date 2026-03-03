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
        Schema::table('notes', function (Blueprint $table) {
            $table->string('type')->default('general')->after('user_id'); // general, debt
            $table->string('debtor_name')->nullable()->after('title');
            $table->decimal('amount', 15, 2)->nullable()->after('debtor_name');
            $table->decimal('interest_rate', 5, 2)->nullable()->after('amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn(['type', 'debtor_name', 'amount', 'interest_rate']);
        });
    }
};
