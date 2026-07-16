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
        // 1. Delete duplicate rows, keeping only the latest (highest ID) row for each group
        \Illuminate\Support\Facades\DB::statement('
            DELETE f1 FROM student_fees f1
            INNER JOIN student_fees f2 ON 
                f1.student_id = f2.student_id AND 
                f1.month_year = f2.month_year AND 
                f1.fee_type = f2.fee_type AND 
                (f1.program_id = f2.program_id OR (f1.program_id IS NULL AND f2.program_id IS NULL))
            WHERE f1.id < f2.id
        ');

        // 2. Create the unique constraint index
        Schema::table('student_fees', function (Blueprint $table) {
            $table->unique(['student_id', 'month_year', 'fee_type', 'program_id'], 'student_fees_unique_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->dropUnique('student_fees_unique_index');
        });
    }
};
