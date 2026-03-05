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
            $table->string('title')->nullable()->change();
            $table->foreignId('category_id')->nullable()->after('type')->constrained('transaction_categories')->nullOnDelete();
            $table->boolean('is_repeat')->default(false)->after('is_completed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('title')->nullable(false)->change();
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn('is_repeat');
        });
    }
};
