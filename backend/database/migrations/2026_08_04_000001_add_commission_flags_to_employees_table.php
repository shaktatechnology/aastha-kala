<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds two explicit commission eligibility flags to employees.
     * Existing records are back-filled:
     *   salary_basis = 'percentage' → earns_fee_commission = true
     *   salary_basis = 'none'       → earns_income_commission = true (only if instructor record exists)
     *   salary_basis = 'salary'     → both false
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('earns_fee_commission')->default(false)->after('percentage');
            $table->boolean('earns_income_commission')->default(false)->after('earns_fee_commission');
        });

        // Back-fill fee commission flag for percentage-basis employees
        DB::table('employees')
            ->where('salary_basis', 'percentage')
            ->update(['earns_fee_commission' => true]);

        // Back-fill income commission flag for none-basis employees who have an instructor record
        $instructorEmployeeIds = DB::table('instructors')
            ->whereNotNull('employee_id')
            ->pluck('employee_id');

        if ($instructorEmployeeIds->isNotEmpty()) {
            DB::table('employees')
                ->where('salary_basis', 'none')
                ->whereIn('id', $instructorEmployeeIds)
                ->update(['earns_income_commission' => true]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['earns_fee_commission', 'earns_income_commission']);
        });
    }
};
