<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$employee = App\Models\Employee::with('instructor')->find(1);
$instructor = $employee->instructor;
$monthYearStr = '2026-07';

$feesQuery = \App\Models\StudentFee::where('month_year', $monthYearStr)
    ->where('fee_type', 'program')
    ->whereExists(function ($query) use ($instructor) {
        $query->select(Illuminate\Support\Facades\DB::raw(1))
            ->from('student_programs')
            ->whereColumn('student_programs.student_id', 'student_fees.student_id')
            ->whereColumn('student_programs.program_id', 'student_fees.program_id')
            ->where(function ($spQuery) use ($instructor) {
                $spQuery->where(function ($bq) use ($instructor) {
                    $bq->whereExists(function ($sub) use ($instructor) {
                        $sub->select(Illuminate\Support\Facades\DB::raw(1))
                            ->from('bookings')
                            ->whereColumn('bookings.id', 'student_programs.booking_id')
                            ->where(function ($bi) use ($instructor) {
                                $bi->where('bookings.instructor_id', $instructor->id)
                                   ->orWhereExists(function ($bs) use ($instructor) {
                                       $bs->select(Illuminate\Support\Facades\DB::raw(1))
                                          ->from('booking_schedule')
                                          ->join('program_schedules', 'program_schedules.id', '=', 'booking_schedule.program_schedule_id')
                                          ->whereColumn('booking_schedule.booking_id', 'bookings.id')
                                          ->where('program_schedules.instructor_id', $instructor->id);
                                   })
                                   ->orWhereExists(function ($bsch) use ($instructor) {
                                       $bsch->select(Illuminate\Support\Facades\DB::raw(1))
                                          ->from('program_schedules')
                                          ->whereColumn('program_schedules.id', 'bookings.schedule_id')
                                          ->where('program_schedules.instructor_id', $instructor->id);
                                   });
                            });
                    });
                })
                ->orWhere(function ($pq) use ($instructor) {
                    $pq->whereNull('student_programs.booking_id')
                       ->where(function ($innerP) use ($instructor) {
                           $innerP->whereExists(function ($pi) use ($instructor) {
                               $pi->select(Illuminate\Support\Facades\DB::raw(1))
                                  ->from('program_instructor')
                                  ->whereColumn('program_instructor.program_id', 'student_programs.program_id')
                                  ->where('program_instructor.instructor_id', $instructor->id);
                           })
                           ->orWhereExists(function ($ps) use ($instructor) {
                               $ps->select(Illuminate\Support\Facades\DB::raw(1))
                                  ->from('program_schedules')
                                  ->whereColumn('program_schedules.program_id', 'student_programs.program_id')
                                  ->where('program_schedules.instructor_id', $instructor->id);
                           });
                       });
                });
            });
    });

echo "Count: " . $feesQuery->count() . "\n";
print_r($feesQuery->get()->toArray());
