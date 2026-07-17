<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_programs', function (Blueprint $table) {
            // 'duration' = fee × months (existing default)
            // 'monthly'  = per-month rate, no duration multiplier
            // 'fixed'    = lump-sum, installment-payable
            $table->enum('billing_mode', ['duration', 'monthly', 'fixed'])
                  ->default('duration')
                  ->after('custom_fee');

            // Per-cycle discount stored on enrollment (auto-applied for monthly mode)
            $table->decimal('monthly_discount', 10, 2)->default(0)->nullable()->after('billing_mode');
            $table->enum('monthly_discount_type', ['cash', 'percentage'])
                  ->default('cash')
                  ->nullable()
                  ->after('monthly_discount');
        });
    }

    public function down(): void
    {
        Schema::table('student_programs', function (Blueprint $table) {
            $table->dropColumn(['billing_mode', 'monthly_discount', 'monthly_discount_type']);
        });
    }
};

