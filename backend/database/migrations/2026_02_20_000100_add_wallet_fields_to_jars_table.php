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
            $table->string('wallet_type')->default('budget')->after('repeat_this_budget');
            $table->string('currency_unit', 10)->default('VND')->after('wallet_type');
            $table->boolean('notifications_enabled')->default(false)->after('currency_unit');

            $table->index(['user_id', 'wallet_type'], 'jars_user_wallet_type_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jars', function (Blueprint $table) {
            $table->dropIndex('jars_user_wallet_type_index');
            $table->dropColumn(['wallet_type', 'currency_unit', 'notifications_enabled']);
        });
    }
};
