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
        // 1. Add topic_name to company_income_items and make category nullable
        Schema::table('company_income_items', function (Blueprint $table) {
            $table->string('topic_name')->nullable()->after('income_category_id');
            $table->unsignedBigInteger('income_category_id')->nullable()->change();
        });

        // 2. Add payer_phone to company_incomes
        Schema::table('company_incomes', function (Blueprint $table) {
            $table->string('payer_phone')->nullable()->after('payer_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_income_items', function (Blueprint $table) {
            $table->dropColumn('topic_name');
            $table->unsignedBigInteger('income_category_id')->nullable(false)->change();
        });

        Schema::table('company_incomes', function (Blueprint $table) {
            $table->dropColumn('payer_phone');
        });
    }
};
