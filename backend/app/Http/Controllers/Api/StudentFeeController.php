<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentFee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StudentFeeController extends Controller
{
    public function index(Request $request)
    {
        // Select consolidated records grouped by student and month/period
        $query = StudentFee::with(['student'])
        ->whereHas('student', function($q){
            $q->where('status', ['active', 'graduated']);
        })
            ->selectRaw('
                MAX(student_fees.id) as id,
                student_id, 
                month_year, 
                SUM(total_amount) as total_amount, 
                SUM(total_amount) as net_amount, 
                SUM(paid_amount) as paid_amount, 
                (SUM(total_amount) - SUM(paid_amount)) as pending_amount,
                SUM(COALESCE(admission_fee, 0) + COALESCE(program_fee, 0)) as gross_amount,
                (SUM(COALESCE(admission_fee, 0) + COALESCE(program_fee, 0)) - SUM(total_amount)) as discount_amount,
                GROUP_CONCAT(DISTINCT fee_type) as fee_types,
                MAX(remarks) as remarks,
                MAX(payment_method) as payment_method,
                CASE WHEN (SUM(total_amount) - SUM(paid_amount)) <= 0 THEN "paid" ELSE "pending" END as status,
                MAX(created_at) as created_at
            ')
            ->groupBy('student_id', 'month_year')
            ->orderByDesc('created_at');

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('status')) {
            // Because status is calculated, we filter by the SUM of pending_amount
            if ($request->status === 'paid') {
                $query->having('pending_amount', '<=', 0);
            } else {
                $query->having('pending_amount', '>', 0);
            }
        }

        if ($request->filled('fee_type')) {
            $query->where('fee_type', $request->fee_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('shift')) {
            $scheduleId = $request->shift;
            $query->whereHas('student.enrollments.booking', function ($q) use ($scheduleId) {
                $q->where('schedule_id', $scheduleId)
                  ->orWhereHas('schedules', function($sq) use ($scheduleId) {
                      $sq->where('program_schedules.id', $scheduleId);
                  });
            });
        }

        if ($request->filled('instructor_id')) {
            $instructorId = $request->instructor_id;
            $query->where(function($q) use ($instructorId) {
                // Check if the specific program for this fee record has the instructor
                $q->whereHas('program.instructors', function($sq) use ($instructorId) {
                    $sq->where('instructors.id', $instructorId);
                })
                // OR if it's a student-level fee (like admission) check if any of their programs has the instructor
                ->orWhere(function($sq) use ($instructorId) {
                    $sq->whereNull('program_id')
                       ->whereHas('student.programs.instructors', function($ssq) use ($instructorId) {
                           $ssq->where('instructors.id', $instructorId);
                       });
                });
            });
        }

        if ($request->filled('program_id')) {
            $programId = $request->program_id;
            $query->where(function($q) use ($programId) {
                $q->where('program_id', $programId)
                  ->orWhere(function($sq) use ($programId) {
                      $sq->whereNull('program_id')
                         ->whereHas('student.programs', function($ssq) use ($programId) {
                             $ssq->where('programs.id', $programId);
                         });
                  });
            });
        }

        if ($request->filled('month_year')) {
            $query->where('month_year', 'like', "%{$request->month_year}%");
        }

        // For complex grouped queries with HAVING, paginate handles it better if we explicitly tell it to wrap
        $fees = $query->paginate(10);

        // Accurate summary stats for ALL records matching filters (ignoring pagination)
        $baseStatsQuery = StudentFee::query();
        if ($request->filled('student_id')) $baseStatsQuery->where('student_id', $request->student_id);
        if ($request->filled('fee_type')) $baseStatsQuery->where('fee_type', $request->fee_type);
        if ($request->filled('search')) {
            $search = $request->search;
            $baseStatsQuery->whereHas('student', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('shift')) {
            $scheduleId = $request->shift;
            $baseStatsQuery->whereHas('student.enrollments.booking', function ($q) use ($scheduleId) {
                $q->where('schedule_id', $scheduleId)
                  ->orWhereHas('schedules', function($sq) use ($scheduleId) {
                      $sq->where('program_schedules.id', $scheduleId);
                  });
            });
        }

        if ($request->filled('instructor_id')) {
            $instructorId = $request->instructor_id;
            $baseStatsQuery->where(function($q) use ($instructorId) {
                $q->whereHas('program.instructors', function($sq) use ($instructorId) {
                    $sq->where('instructors.id', $instructorId);
                })
                ->orWhere(function($sq) use ($instructorId) {
                    $sq->whereNull('program_id')
                       ->whereHas('student.programs.instructors', function($ssq) use ($instructorId) {
                           $ssq->where('instructors.id', $instructorId);
                       });
                });
            });
        }

        if ($request->filled('program_id')) {
            $programId = $request->program_id;
            $baseStatsQuery->where(function($q) use ($programId) {
                $q->where('program_id', $programId)
                  ->orWhere(function($sq) use ($programId) {
                      $sq->whereNull('program_id')
                         ->whereHas('student.programs', function($ssq) use ($programId) {
                             $ssq->where('programs.id', $programId);
                         });
                  });
            });
        }

        if ($request->filled('month_year')) {
            $baseStatsQuery->where('month_year', 'like', "%{$request->month_year}%");
        }

        // Summary for dashboard
        $totalCollected = (float) $baseStatsQuery->sum('paid_amount');
        $totalBilled = (float) $baseStatsQuery->sum('total_amount');
        $totalGross = (float) $baseStatsQuery->sum(\DB::raw('COALESCE(admission_fee, 0) + COALESCE(program_fee, 0)'));
        
        $totals = [
            'total_collected' => $totalCollected,
            'total_billed' => $totalBilled,
            'total_gross' => $totalGross,
            'total_pending' => max(0, $totalBilled - $totalCollected),
            'paid_count' => (int) StudentFee::select('student_id', 'month_year')
                ->groupBy('student_id', 'month_year')
                ->havingRaw('SUM(total_amount) - SUM(paid_amount) <= 0')
                ->get()->count(),
            'pending_count' => (int) StudentFee::select('student_id', 'month_year')
                ->groupBy('student_id', 'month_year')
                ->havingRaw('SUM(total_amount) - SUM(paid_amount) > 0')
                ->get()->count(),
        ];

        return response()->json([
            'message' => 'Fees fetched successfully',
            'data' => $fees,
            'summary' => $totals
        ]);
    }

    /**
     * Check if a student has already paid admission fee and get their program fee info.
     * Admission fee is now a global one-time fee stored in Settings.
     */
    public function studentFeeInfo(Request $request, $studentId)
    {
        $student = Student::find($studentId);
        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        $requestedMonth = $request->query('month_year');

        // Fetch all payment records for this student in this month to get individual program statuses
        $monthRecords = collect();
        if ($requestedMonth) {
            $monthRecords = StudentFee::where('student_id', $studentId)
                ->where('month_year', $requestedMonth)
                ->get();
        }

        // Get global admission fee from settings
        $setting = \App\Models\Setting::first();
        $globalAdmissionFee = $setting ? (float) $setting->admission_fee : null;

        // Find admission record - prioritize the requested month if available, otherwise find any
        $admissionRecord = null;
        if ($requestedMonth) {
            $admissionRecord = StudentFee::where('student_id', $studentId)
                ->where('month_year', $requestedMonth)
                ->where(function ($q) {
                    $q->where('fee_type', 'admission')
                        ->orWhere('fee_type', 'billing');
                })
                ->first();
        }

        if (!$admissionRecord) {
            $admissionRecord = StudentFee::where('student_id', $studentId)
                ->where(function ($q) {
                    $q->where('fee_type', 'admission')
                        ->orWhere('fee_type', 'billing');
                })
                ->orderByRaw("CASE WHEN status = 'paid' THEN 0 ELSE 1 END") // Prioritize paid status
                ->orderByDesc('id') // Then most recent
                ->first();
        }

        // Calculate global admission totals to handle existing historical duplicates
        $globalAdmTotals = StudentFee::where('student_id', $studentId)
            ->where(function ($q) {
                $q->where('fee_type', 'admission')
                    ->orWhere('fee_type', 'billing');
            })
            ->selectRaw('SUM(paid_amount) as total_paid, SUM(total_amount) as net_amount')
            ->first();

        $admissionPaid = $globalAdmTotals && $globalAdmTotals->net_amount > 0 && ($globalAdmTotals->total_paid >= $globalAdmTotals->net_amount);
        $admissionAmount = $admissionRecord ? ($admissionRecord->admission_fee ?? $admissionRecord->total_amount) : $globalAdmissionFee;
        $admissionExists = $admissionRecord ? true : false;
        $admissionPaidAmount = $globalAdmTotals ? (float)$globalAdmTotals->total_paid : 0;

        // Force paid status if cumulative total matches net
        if ($admissionPaid) {
            $admissionPaid = true;
        }

        // Try to get program fees from proper relations first
        $programFees = null;
        $matchingPrograms = collect();
        $classTitles = [];
        $unmatched = [];

        $enrollments = \App\Models\StudentProgram::with('program')
            ->where('student_id', $studentId)
            ->where('status', 'active')
            ->get();

        if ($enrollments->isNotEmpty()) {
            $matchingPrograms = $enrollments->pluck('program')->filter();
            $classTitles = $matchingPrograms->pluck('title')->toArray();
        } else if ($student->classes) {
            // Fallback to legacy comma-separated field
            $classTitles = array_map('trim', array_filter(explode(',', $student->classes)));

            if (!empty($classTitles)) {
                $matchingPrograms = \App\Models\Program::where('is_active', true)
                    ->where(function ($q) use ($classTitles) {
                        foreach ($classTitles as $title) {
                            $q->orWhereRaw('LOWER(title) = ?', [strtolower($title)]);
                        }
                    })
                    ->get();

                if ($matchingPrograms->isEmpty()) {
                    $matchingPrograms = \App\Models\Program::where('is_active', true)
                        ->where(function ($q) use ($classTitles) {
                            foreach ($classTitles as $title) {
                                $q->orWhere('title', 'LIKE', "%{$title}%");
                            }
                        })
                        ->get();
                }
            }
        }

        if ($matchingPrograms->isNotEmpty() || !empty($classTitles)) {
            $breakdown = [];
            $totalFee = 0;
            $totalAdm = 0;
            $matchedTitles = [];

            foreach ($enrollments->isNotEmpty() ? $enrollments : $matchingPrograms as $item) {
                if ($item instanceof \App\Models\StudentProgram) {
                    $p = $item->program;
                    $customFee = $item->custom_fee;
                } else {
                    $p = $item;
                    $customFee = null;
                }

                if (!$p) continue;

                $baseFee = $customFee !== null ? (float) $customFee : (float) ($p->program_fee ?? 0);
                $adm = (float) ($p->admission_fee ?? 0);

                // Calculate duration multiplier based on student's enrollment duration
                $multiplier = 1;
                if ($student->duration_value && $student->duration_unit) {
                    $val = (float) $student->duration_value;
                    if ($student->duration_unit === 'months') {
                        $multiplier = $val;
                    } elseif ($student->duration_unit === 'years') {
                        $multiplier = $val * 12;
                    }
                }
                
                $fee = $baseFee * $multiplier;

                // Find existing payment for THIS specific program in THIS month
                $existing = $monthRecords->where('program_id', $p->id)->first();

                $totalFee += $fee;
                $totalAdm += $adm;
                $matchedTitles[] = strtolower($p->title);
                $breakdown[] = [
                    'id' => $p->id,
                    'title' => $p->title,
                    'program_fee' => $fee,
                    'admission_fee' => $adm,
                    'paid_amount' => $existing ? (float) $existing->paid_amount : 0,
                    'discount' => $existing ? (float) $existing->program_discount : 0,
                    'discount_type' => $existing ? $existing->program_discount_type : 'cash',
                    'status' => $existing ? $existing->status : 'pending',
                ];
            }

            if ($enrollments->isEmpty() && !empty($classTitles)) {
                foreach ($classTitles as $originalTitle) {
                    if (!in_array(strtolower($originalTitle), $matchedTitles)) {
                        $unmatched[] = $originalTitle;
                    }
                }
            }
        }

        // Find the "most descriptive" admission record (one that defines price/discount)
        $admissionRecord = $monthRecords->where('fee_type', 'admission')->where('admission_discount', '>', 0)->first() 
                          ?? $monthRecords->where('fee_type', 'admission')->where('admission_fee', '>', 0)->first()
                          ?? $monthRecords->where('fee_type', 'admission')->first();
        
        // Build the final program fees structure
        $finalBreakdown = [];
        if (!empty($breakdown)) {
            foreach ($breakdown as $b) {
                // IMPORTANT: We use $b['program_fee'] which is the LATEST duration-based calculation
                // This ensures that if a student's duration is changed, the bill reflects it immediately.
                $finalBreakdown[] = [
                    'id' => $b['id'],
                    'title' => $b['title'],
                    'program_fee' => $b['program_fee'],
                    'paid_amount' => $b['paid_amount'],
                    'discount' => $b['discount'],
                    'discount_type' => $b['discount_type'],
                    'status' => $b['status']
                ];
            }
        }

        $programFees = [
            'admission_fee' => $admissionAmount,
            'program_fee' => collect($finalBreakdown)->sum('program_fee'),
            'paid_amount' => collect($finalBreakdown)->sum('paid_amount'),
            'discount' => collect($finalBreakdown)->sum('discount'),
            'programs_breakdown' => $finalBreakdown
        ];

        return response()->json([
            'message' => 'Student fee info fetched',
            'data' => [
                'student' => [
                    'id' => $studentId,
                    'name' => $student->name,
                    'classes' => $student->classes,
                ],
                'admission_paid' => $admissionPaid,
                'admission_exists' => $admissionExists,
                'admission_amount' => $admissionAmount,
                'admission_paid_amount' => $admissionPaidAmount,
                'admission_discount' => $admissionRecord ? $monthRecords->where('fee_type', 'admission')->sum('admission_discount') : 0,
                'admission_discount_type' => $admissionRecord ? $admissionRecord->admission_discount_type : 'cash',
                'global_admission_fee' => $globalAdmissionFee,
                'program_fees' => $programFees,
                'breakdown' => $breakdown ?? [],
                'unmatched' => $unmatched ?? [],
                'period_record' => $monthRecords->first(),
                'payments' => $monthRecords->sortByDesc('created_at')->values(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'fee_type' => 'required|in:admission,program,billing',
            'month_year' => 'required|string',
            'payment_method' => 'nullable|string',
            'remarks' => 'nullable|string',
            'selected_programs' => 'nullable|array',
            'program_payments' => 'nullable|array',
            'program_fees' => 'nullable|array',
            'program_discounts' => 'nullable|array',
            'admission_fee' => 'nullable|numeric|min:0',
            'admission_discount' => 'nullable|numeric|min:0',
            'admission_discount_type' => 'nullable|in:cash,percentage',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $studentId = $request->student_id;
        $monthYear = $request->month_year;

        // Common data for all records in this billing session
        $baseData = [
            'student_id' => $studentId,
            'month_year' => $monthYear,
            'payment_method' => $request->payment_method ?? 'Cash',
            'remarks' => $request->remarks,
        ];

        // 1. Handle Admission-wise Records
        if ($request->fee_type === 'admission' || $request->fee_type === 'billing') {
            $admBase = (float) $request->input('admission_fee', 0);
            
            // Fallback to setting only if request admission_fee is 0 or not provided
            if ($admBase <= 0) {
                $setting = \App\Models\Setting::first();
                $admBase = $setting ? (float) $setting->admission_fee : 0;
            }
            
            if ($admBase > 0) {
                $admDisc = (float) $request->input('admission_discount', 0);
                $admDiscType = $request->input('admission_discount_type', 'cash');

                if ($admDiscType === 'percentage') {
                    $admNet = max(0, $admBase - ($admBase * $admDisc / 100));
                } else {
                    $admNet = max(0, $admBase - $admDisc);
                }

                $admPaid = (float) $request->input('admission_paid_amount', 0);
                
                // Aggregates for adjustment
                $existingBill = StudentFee::where('student_id', $studentId)->where('fee_type', 'admission')->sum('total_amount');
                $existingPaid = StudentFee::where('student_id', $studentId)->where('fee_type', 'admission')->sum('paid_amount');
                $existingBase = StudentFee::where('student_id', $studentId)->where('fee_type', 'admission')->sum('admission_fee');
                $existingDisc = StudentFee::where('student_id', $studentId)->where('fee_type', 'admission')->sum('admission_discount');

                $billAdjustment = $admNet - (float)$existingBill;
                $paidAdjustment = max(0, $admPaid - (float)$existingPaid);
                $baseAdjustment = $admBase - (float)$existingBase;
                $discAdjustment = $admDisc - (float)$existingDisc;

                if ($paidAdjustment > 0 || abs($billAdjustment) > 0 || abs($baseAdjustment) > 0 || abs($discAdjustment) > 0) {
                    StudentFee::create(
                        array_merge($baseData, [
                            'fee_type' => 'admission',
                            'total_amount' => $billAdjustment,
                            'paid_amount' => $paidAdjustment,
                            'pending_amount' => max(0, $admNet - $admPaid),
                            'status' => ($admNet - $admPaid) <= 0 ? 'paid' : 'pending',
                            'admission_fee' => $baseAdjustment,
                            'admission_discount' => $discAdjustment,
                            'admission_discount_type' => $admDiscType,
                            'admission_paid' => ($admNet - $admPaid) <= 0,
                            'program_fee' => 0,
                            'program_discount' => 0,
                        ])
                    );
                }
            }
        }   

        // 2. Handle Program-wise Records
        if ($request->fee_type === 'program' || $request->fee_type === 'billing') {
            $selectedIds = $request->selected_programs ?? [];
            $programPayments = $request->program_payments ?? [];
            $programDiscounts = $request->program_discounts ?? [];

            foreach ($selectedIds as $progId) {
                $prog = \App\Models\Program::find($progId);
                if (!$prog) continue;

                // Calculate base fee, accounting for duration if falling back to program default
                if (isset($request->program_fees[$progId])) {
                    $progBase = (float)$request->program_fees[$progId];
                } else {
                    // Try to get custom_fee from the student's program enrollment
                    $studentProgram = \App\Models\StudentProgram::where('student_id', $studentId)
                        ->where('program_id', $progId)
                        ->first();
                    $baseFee = ($studentProgram && $studentProgram->custom_fee !== null)
                        ? (float) $studentProgram->custom_fee
                        : (float) $prog->program_fee;

                    $multiplier = 1;
                    $student = \App\Models\Student::find($studentId);
                    if ($student && $student->duration_value && $student->duration_unit) {
                        $val = (float) $student->duration_value;
                        if ($student->duration_unit === 'months') {
                            $multiplier = $val;
                        } elseif ($student->duration_unit === 'years') {
                            $multiplier = $val * 12;
                        }
                    }
                    $progBase = $baseFee * $multiplier;
                }
                $discInfo = $programDiscounts[$progId] ?? ['amount' => 0, 'type' => 'cash'];
                $progDisc = (float) $discInfo['amount'];
                $progDiscType = $discInfo['type'] ?? 'cash';

                if ($progDiscType === 'percentage') {
                    $progNet = max(0, $progBase - ($progBase * $progDisc / 100));
                } else {
                    $progNet = max(0, $progBase - $progDisc);
                }

                $progPaid = isset($programPayments[$progId]) ? (float) $programPayments[$progId] : 0;
                
                // Aggregates for adjustment
                $existingBill = StudentFee::where('student_id', $studentId)->where('month_year', $monthYear)->where('fee_type', 'program')->where('program_id', $progId)->sum('total_amount');
                $existingPaid = StudentFee::where('student_id', $studentId)->where('month_year', $monthYear)->where('fee_type', 'program')->where('program_id', $progId)->sum('paid_amount');
                $existingBase = StudentFee::where('student_id', $studentId)->where('month_year', $monthYear)->where('fee_type', 'program')->where('program_id', $progId)->sum('program_fee');
                $existingDisc = StudentFee::where('student_id', $studentId)->where('month_year', $monthYear)->where('fee_type', 'program')->where('program_id', $progId)->sum('program_discount');

                $billAdjustment = $progNet - (float)$existingBill;
                $paidAdjustment = max(0, $progPaid - (float)$existingPaid);
                $baseAdjustment = $progBase - (float)$existingBase;
                $discAdjustment = $progDisc - (float)$existingDisc;

                if ($paidAdjustment > 0 || abs($billAdjustment) > 0 || abs($baseAdjustment) > 0 || abs($discAdjustment) > 0) {
                    StudentFee::create(
                        array_merge($baseData, [
                            'fee_type' => 'program',
                            'program_id' => $progId,
                            'total_amount' => $billAdjustment,
                            'paid_amount' => $paidAdjustment,
                            'pending_amount' => max(0, $progNet - $progPaid),
                            'status' => ($progNet - $progPaid) <= 0 ? 'paid' : 'pending',
                            'program_fee' => $baseAdjustment,
                            'program_discount' => $discAdjustment,
                            'program_discount_type' => $progDiscType,
                            'admission_fee' => 0,
                            'admission_discount' => 0,
                        ])
                    );
                }
            }
        }

        return response()->json(['message' => 'Fees processed successfully'], 201);
    }

    public function update(Request $request, $id)
    {
        // For consolidated updates, we find the representative record, then update its entire group
        $reproFee = StudentFee::findOrFail($id);

        // We redirect to the store logic but ensuring we use the same student and month
        $request->merge([
            'student_id' => $reproFee->student_id,
            'month_year' => $reproFee->month_year,
        ]);

        return $this->store($request);
    }

    public function destroy($id)
    {
        $fee = StudentFee::findOrFail($id);

        // Delete the entire billing group for this month/period
        StudentFee::where('student_id', $fee->student_id)
            ->where('month_year', $fee->month_year)
            ->delete();

        return response()->json([
            'message' => 'Consolidated billing record deleted successfully'
        ]);
    }

    public function getSchedules()
    {
        $schedules = \App\Models\ProgramSchedule::with(['instructor', 'program'])
            ->get()
            ->map(function($s) {
                $startTime = substr($s->start_time, 0, 5);
                $endTime = substr($s->end_time, 0, 5);
                $instructorName = $s->instructor ? $s->instructor->name : 'N/A';
                return [
                    'id' => $s->id,
                    'title' => "{$startTime} - {$endTime} ({$instructorName})",
                ];
            })
            ->unique('title')
            ->values();

        return response()->json([
            'success' => true,
            'data' => $schedules
        ]);
    }
}


