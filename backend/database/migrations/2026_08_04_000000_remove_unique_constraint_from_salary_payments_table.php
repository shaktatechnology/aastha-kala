<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('salary_payments', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->index('employee_id');
                $table->dropUnique('unique_salary_payments_employee_period_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary_payments', function (Blueprint $table) {
            $table->unique(['employee_id', 'month', 'year', 'payment_type'], 'unique_salary_payments_employee_period_type');
            $table->dropIndex(['employee_id']);
        });
    }
};
