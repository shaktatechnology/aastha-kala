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
        Schema::create('salary_payment_student_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_payment_id')->constrained('salary_payments')->onDelete('cascade');
            $table->foreignId('student_fee_id')->nullable()->constrained('student_fees')->onDelete('set null');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('program_id')->constrained('programs')->onDelete('cascade');
            $table->string('month_year', 20);
            $table->decimal('gross_commission', 10, 2)->default(0);
            $table->decimal('net_commission', 10, 2)->default(0);
            $table->timestamps();

            $table->index(['student_id', 'program_id', 'month_year'], 'sp_fee_month_idx');
        });

        // Back-fill existing commission payments if any exist
        $payments = DB::table('salary_payments')
            ->where('payment_type', 'commission')
            ->get();

        foreach ($payments as $payment) {
            $employee = DB::table('employees')->where('id', $payment->employee_id)->first();
            if (!$employee) continue;

            $instructor = DB::table('instructors')->where('employee_id', $employee->id)->first();
            if (!$instructor) continue;

            $bm = (int) $payment->month;
            $by = (int) $payment->year;

            // Generate variants
            $bsFormatted = sprintf('%04d-%02d', $by, $bm);
            $bsRaw       = sprintf('%d-%d', $by, $bm);
            if ($bm >= 1 && $bm <= 8) {
                $adM = $bm + 4;
                $adY = $by - 57;
            } else {
                $adM = $bm - 8;
                $adY = $by - 56;
            }
            $adFormatted = sprintf('%04d-%02d', $adY, $adM);
            $adRaw       = sprintf('%d-%d', $adY, $adM);

            $variants = array_values(array_unique([$bsFormatted, $bsRaw, $adFormatted, $adRaw]));

            // Find matching student fees
            $fees = DB::table('student_fees')
                ->whereIn('month_year', $variants)
                ->where('fee_type', 'program')
                ->get();

            if ($fees->isEmpty()) continue;

            $vatPercentage = 13.00;
            $setting = DB::table('settings')->first();
            if ($setting && isset($setting->vat_percentage)) {
                $vatPercentage = (float) $setting->vat_percentage;
            }
            $vatRate = $vatPercentage / 100;
            $globalRate = (float) ($employee->percentage ?? 0);

            foreach ($fees as $fee) {
                if (!$fee->program_id) continue;

                // Check student program custom rate
                $sp = DB::table('student_programs')
                    ->where('student_id', $fee->student_id)
                    ->where('program_id', $fee->program_id)
                    ->first();

                $rate = ($sp && $sp->commission_percentage !== null)
                    ? (float) $sp->commission_percentage
                    : $globalRate;

                $gross = (float) $fee->paid_amount * ($rate / 100);
                $net   = $gross - ($gross * $vatRate);

                if ($gross > 0) {
                    DB::table('salary_payment_student_fees')->insert([
                        'salary_payment_id' => $payment->id,
                        'student_fee_id'    => $fee->id,
                        'student_id'        => $fee->student_id,
                        'program_id'        => $fee->program_id,
                        'month_year'        => $fee->month_year,
                        'gross_commission'  => round($gross, 2),
                        'net_commission'    => round($net, 2),
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_payment_student_fees');
    }
};
