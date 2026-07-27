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
            $q->whereIn('status', ['active', 'graduated']);
        })
            ->selectRaw('
                MAX(student_fees.id) as id,
                student_id, 
                month_year, 
                SUM(total_amount) as total_amount, 
                SUM(total_amount) as net_amount, 
                SUM(paid_amount) as paid_amount, 
                (SUM(total_amount) - SUM(paid_amount)) as pending_amount,
                SUM(COALESCE(return_amount, 0)) as return_amount,
                SUM(COALESCE(admission_fee, 0) + COALESCE(program_fee, 0)) as gross_amount,
                (SUM(COALESCE(admission_fee, 0) + COALESCE(program_fee, 0)) - SUM(total_amount)) as discount_amount,
                GROUP_CONCAT(DISTINCT fee_type) as fee_types,
                MAX(remarks) as remarks,
                MAX(payment_method) as payment_method,
                CASE WHEN (SUM(total_amount) - SUM(paid_amount)) <= 0 THEN "paid" ELSE "pending" END as status,
                MAX(created_at) as created_at,
                MAX(student_fees.updated_at) as updated_at
            ')
            ->groupBy('student_id', 'month_year')
            ->orderByDesc('updated_at');

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
            
            $billId = null;
            if (preg_match('/^(?:#)?FEE-(\d+)$/i', trim($search), $matches)) {
                $billId = (int)$matches[1];
            } elseif (is_numeric(trim($search))) {
                $billId = (int)trim($search);
            }

            $query->where(function ($q) use ($search, $billId) {
                $q->whereHas('student', function ($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%")
                       ->orWhere('phone', 'like', "%{$search}%");
                });
                if ($billId) {
                    $q->orWhereExists(function ($sub) use ($billId) {
                        $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                            ->from('student_fees as sf_sub')
                            ->whereColumn('sf_sub.student_id', 'student_fees.student_id')
                            ->whereColumn('sf_sub.month_year', 'student_fees.month_year')
                            ->where('sf_sub.id', $billId);
                    });
                }
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
            $query->where('fee_type', 'program')
                  ->whereExists(function ($subQuery) use ($instructorId) {
                      $subQuery->select(\Illuminate\Support\Facades\DB::raw(1))
                          ->from('student_programs')
                          ->whereColumn('student_programs.student_id', 'student_fees.student_id')
                          ->whereColumn('student_programs.program_id', 'student_fees.program_id')
                          ->where(function ($spQuery) use ($instructorId) {
                              $spQuery->where(function ($bq) use ($instructorId) {
                                  $bq->whereExists(function ($sub) use ($instructorId) {
                                      $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                                          ->from('bookings')
                                          ->whereColumn('bookings.id', 'student_programs.booking_id')
                                          ->where(function ($bi) use ($instructorId) {
                                              $bi->where('bookings.instructor_id', $instructorId)
                                                 ->orWhereExists(function ($bs) use ($instructorId) {
                                                     $bs->select(\Illuminate\Support\Facades\DB::raw(1))
                                                        ->from('booking_schedule')
                                                        ->join('program_schedules', 'program_schedules.id', '=', 'booking_schedule.program_schedule_id')
                                                        ->whereColumn('booking_schedule.booking_id', 'bookings.id')
                                                        ->where('program_schedules.instructor_id', $instructorId);
                                                 })
                                                 ->orWhereExists(function ($bsch) use ($instructorId) {
                                                     $bsch->select(\Illuminate\Support\Facades\DB::raw(1))
                                                        ->from('program_schedules')
                                                        ->whereColumn('program_schedules.id', 'bookings.schedule_id')
                                                        ->where('program_schedules.instructor_id', $instructorId);
                                                 });
                                          });
                                  });
                              })
                              ->orWhere(function ($pq) use ($instructorId) {
                                  $pq->whereNull('student_programs.booking_id')
                                     ->where(function ($innerP) use ($instructorId) {
                                         $innerP->whereExists(function ($pi) use ($instructorId) {
                                             $pi->select(\Illuminate\Support\Facades\DB::raw(1))
                                                ->from('program_instructor')
                                                ->whereColumn('program_instructor.program_id', 'student_programs.program_id')
                                                ->where('program_instructor.instructor_id', $instructorId);
                                         })
                                         ->orWhereExists(function ($ps) use ($instructorId) {
                                             $ps->select(\Illuminate\Support\Facades\DB::raw(1))
                                                ->from('program_schedules')
                                                ->whereColumn('program_schedules.program_id', 'student_programs.program_id')
                                                ->where('program_schedules.instructor_id', $instructorId);
                                         });
                                     });
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
            
            $billId = null;
            if (preg_match('/^(?:#)?FEE-(\d+)$/i', trim($search), $matches)) {
                $billId = (int)$matches[1];
            } elseif (is_numeric(trim($search))) {
                $billId = (int)trim($search);
            }

            $baseStatsQuery->where(function ($q) use ($search, $billId) {
                $q->whereHas('student', function ($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%")
                       ->orWhere('phone', 'like', "%{$search}%");
                });
                if ($billId) {
                    $q->orWhereExists(function ($sub) use ($billId) {
                        $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                            ->from('student_fees as sf_sub')
                            ->whereColumn('sf_sub.student_id', 'student_fees.student_id')
                            ->whereColumn('sf_sub.month_year', 'student_fees.month_year')
                            ->where('sf_sub.id', $billId);
                    });
                }
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
            $baseStatsQuery->whereHas('student.enrollments.booking', function ($q) use ($instructorId) {
                $q->where('instructor_id', $instructorId)
                  ->orWhereHas('schedules', function($sq) use ($instructorId) {
                      $sq->where('program_schedules.instructor_id', $instructorId);
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
            'paid_count' => (int) (clone $baseStatsQuery)->select('student_id', 'month_year')
                ->groupBy('student_id', 'month_year')
                ->havingRaw('SUM(total_amount) - SUM(paid_amount) <= 0')
                ->get()->count(),
            'pending_count' => (int) (clone $baseStatsQuery)->select('student_id', 'month_year')
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
        $student = Student::with([
            'enrollments.booking.schedules',
            'enrollments.booking.schedule'
        ])->find($studentId);
        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        $requestedMonthRaw = $request->query('month_year');
        $requestedMonth = $this->formatToBsMonthString($requestedMonthRaw);

        // Fetch all payment records for this student in this month
        $monthRecords = collect();
        if ($requestedMonth) {
            $monthRecords = StudentFee::where('student_id', $studentId)
                ->where(function ($q) use ($requestedMonth, $requestedMonthRaw) {
                    $q->where('month_year', $requestedMonth);
                    if ($requestedMonthRaw && $requestedMonthRaw !== $requestedMonth) {
                        $q->orWhere('month_year', $requestedMonthRaw);
                    }
                })
                ->get();
        }

        // Get global admission fee from settings (one-time per student)
        $setting = \App\Models\Setting::first();
        $globalAdmissionFee = $setting ? (float) $setting->admission_fee : null;

        // Admission: find the representative record
        $admissionRecord = null;
        if ($requestedMonth) {
            $admissionRecord = StudentFee::where('student_id', $studentId)
                ->where(function ($q) use ($requestedMonth, $requestedMonthRaw) {
                    $q->where('month_year', $requestedMonth);
                    if ($requestedMonthRaw && $requestedMonthRaw !== $requestedMonth) {
                        $q->orWhere('month_year', $requestedMonthRaw);
                    }
                })
                ->where(function ($q) {
                    $q->where('fee_type', 'admission')->orWhere('fee_type', 'billing');
                })
                ->first();
        }
        if (!$admissionRecord) {
            $admissionRecord = StudentFee::where('student_id', $studentId)
                ->where(function ($q) {
                    $q->where('fee_type', 'admission')->orWhere('fee_type', 'billing');
                })
                ->orderByRaw("CASE WHEN status = 'paid' THEN 0 ELSE 1 END")
                ->orderByDesc('id')
                ->first();
        }

        // Global admission totals (only counting admission fee portions).
        // Cap at the admission base amount to prevent duplicate per-month records
        // (created by a past bug) from inflating the paid total.
        $admissionBaseAmount = $admissionRecord
            ? ($admissionRecord->admission_fee > 0 ? (float)$admissionRecord->admission_fee : ((float)$admissionRecord->total_amount + (float)($admissionRecord->admission_discount ?? 0)))
            : (float)($globalAdmissionFee ?? 0);

        // Sum only pure 'admission' fee_type records (ignore billing/program rows)
        $allAdmRecords = StudentFee::where('student_id', $studentId)
            ->where('fee_type', 'admission')
            ->get();

        $totalAdmNet  = 0;
        $totalAdmPaid = 0;
        foreach ($allAdmRecords as $rec) {
            $totalAdmNet  += (float) $rec->total_amount;
            $totalAdmPaid += (float) $rec->paid_amount;
        }

        // Cap paid/net at the base admission amount to absorb any duplicate records
        if ($admissionBaseAmount > 0) {
            $totalAdmNet  = min($totalAdmNet,  $admissionBaseAmount);
            $totalAdmPaid = min($totalAdmPaid, $admissionBaseAmount);
        }

        $admissionPaid       = $admissionBaseAmount > 0 && ($totalAdmPaid >= $admissionBaseAmount - 0.01);
        $admissionAmount     = $admissionBaseAmount > 0 ? $admissionBaseAmount : $globalAdmissionFee;
        $admissionExists     = $admissionRecord ? true : false;
        $admissionPaidAmount = $totalAdmPaid;

        if ($student->admission_fee_not_required) {
            $globalAdmissionFee = 0.0;
            $admissionAmount = 0.0;
            $admissionPaid = true;
            $admissionExists = false;
            $admissionPaidAmount = 0.0;
        }

        if ($request->filled('instructor_id')) {
            $admissionAmount = 0;
            $admissionPaidAmount = 0;
            $admissionPaid = true;
            $admissionExists = false;
        }

        // Build program fee breakdown
        $breakdown    = [];
        $classTitles  = [];
        $unmatched    = [];

        $enrollments = \App\Models\StudentProgram::with(['program', 'booking.schedules', 'booking.schedule'])
            ->where('student_id', $studentId)
            ->whereIn('status', ['active', 'graduated'])
            ->get();

        if ($request->filled('instructor_id')) {
            $instructorId = $request->instructor_id;
            $enrollments = $enrollments->filter(function ($e) use ($instructorId) {
                if (!$e->booking) return false;
                if ((int)$e->booking->instructor_id === (int)$instructorId) return true;
                return $e->booking->schedules->contains(function ($s) use ($instructorId) {
                    return (int)$s->instructor_id === (int)$instructorId;
                });
            });
        }

        $matchingPrograms = collect();
        if ($enrollments->isNotEmpty()) {
            $matchingPrograms = $enrollments->pluck('program')->filter();
            $classTitles = $matchingPrograms->pluck('title')->toArray();
        } elseif ($student->classes) {
            $classTitles = array_map('trim', array_filter(explode(',', $student->classes)));
            if (!empty($classTitles)) {
                $matchingPrograms = \App\Models\Program::where('is_active', true)
                    ->where(function ($q) use ($classTitles) {
                        foreach ($classTitles as $title) {
                            $q->orWhereRaw('LOWER(title) = ?', [strtolower($title)]);
                        }
                    })->get();
                if ($matchingPrograms->isEmpty()) {
                    $matchingPrograms = \App\Models\Program::where('is_active', true)
                        ->where(function ($q) use ($classTitles) {
                            foreach ($classTitles as $title) {
                                $q->orWhere('title', 'LIKE', "%{$title}%");
                            }
                        })->get();
                }
            }
        }

        $matchedTitles = [];

        foreach ($enrollments->isNotEmpty() ? $enrollments : $matchingPrograms as $item) {
            if ($item instanceof \App\Models\StudentProgram) {
                $p           = $item->program;
                $customFee   = $item->custom_fee;
                $billingMode = $item->billing_mode ?? 'duration';
                $monthlyDiscount     = (float) ($item->monthly_discount ?? 0);
                $monthlyDiscountType = $item->monthly_discount_type ?? 'cash';
            } else {
                $p           = $item;
                $customFee   = null;
                $billingMode = 'duration';
                $monthlyDiscount     = 0;
                $monthlyDiscountType = 'cash';
            }

            if (!$p) continue;

            // Base fee (use custom_fee if explicitly set > 0, else program default)
            // NOTE: programs.admission_fee is intentionally ignored — admission is global via settings
            $baseFee = ($customFee !== null && (float)$customFee > 0) ? (float) $customFee : (float) ($p->program_fee ?? 0);

            $multiplier = match($billingMode) {
                'duration' => (function() use ($student, $item) {
                    $val = null;
                    $unit = null;
                    if ($item instanceof \App\Models\StudentProgram) {
                        $val = $item->duration_value;
                        $unit = $item->duration_unit;
                    }
                    if (!$val && !$unit) {
                        $val = $student->duration_value;
                        $unit = $student->duration_unit;
                    }
                    if ($val && $unit) {
                        $valFloat = (float) $val;
                        return $unit === 'years' ? $valFloat * 12 : $valFloat;
                    }
                    return 1;
                })(),
                'monthly', 'fixed' => 1,
                default => 1,
            };

            $fee = $baseFee * $multiplier;

            // Current-month payment record for this program
            $existing = $monthRecords->where('program_id', $p->id)->first();

            $skipCurrentRow = false;
            $anyExisting = null;
            if ($item instanceof \App\Models\StudentProgram) {
                $anyExisting = StudentFee::where('student_id', $studentId)
                    ->where('program_id', $p->id)
                    ->where('fee_type', 'program')
                    ->orderBy('month_year')
                    ->first();
            }

            if ($anyExisting && in_array($billingMode, ['duration', 'fixed'])) {
                if ($requestedMonth !== $anyExisting->month_year) {
                    $skipCurrentRow = true;
                } else {
                    $existing = $anyExisting;
                    $fee = $anyExisting->total_amount;
                }
            }

            // If enrollment is completed (graduated) or inactive, do NOT generate new current/future month charges
            // (Unless a fee record was already explicitly saved for this month)
            if ($item instanceof \App\Models\StudentProgram && in_array($item->status, ['graduated', 'inactive']) && !$existing) {
                $skipCurrentRow = true;
            }

            // If requestedMonth is BEFORE the program's enrolled_at or enrollment date (and no fee was explicitly saved), skip current row
            $enrolledRaw = null;
            if ($item instanceof \App\Models\StudentProgram && $item->enrolled_at) {
                $enrolledRaw = is_string($item->enrolled_at) ? $item->enrolled_at : $item->enrolled_at->format('Y-m-d');
            }
            if (!$enrolledRaw && $student->billing_start_date) {
                $enrolledRaw = is_string($student->billing_start_date) ? $student->billing_start_date : $student->billing_start_date->format('Y-m-d');
            }
            if (!$enrolledRaw && $student->enrollment_date) {
                $enrolledRaw = is_string($student->enrollment_date) ? $student->enrollment_date : $student->enrollment_date->format('Y-m-d');
            }

            if ($enrolledRaw && $requestedMonth && !$existing) {
                $enrolledMonthBs = $this->formatToBsMonthString(substr($enrolledRaw, 0, 7));
                if ($enrolledMonthBs && $requestedMonth < $enrolledMonthBs) {
                    $skipCurrentRow = true;
                }
            }

            $matchedTitles[] = strtolower($p->title);

            // --- CARRY-FORWARD: fetch all prior unpaid months for monthly, fixed, & duration ---
            if ($requestedMonth && $billingMode === 'monthly') {
                $enrolledDate = null;
                if ($item instanceof \App\Models\StudentProgram && $item->enrolled_at) {
                    $enrolledDate = is_string($item->enrolled_at) ? $item->enrolled_at : $item->enrolled_at->format('Y-m-d');
                }
                if (!$enrolledDate && $student->billing_start_date) {
                    $enrolledDate = is_string($student->billing_start_date) ? $student->billing_start_date : $student->billing_start_date->format('Y-m-d');
                }
                if (!$enrolledDate && $student->enrollment_date) {
                    $enrolledDate = is_string($student->enrollment_date) ? $student->enrollment_date : $student->enrollment_date->format('Y-m-d');
                }

                $earliestRecordMonth = StudentFee::where('student_id', $studentId)
                    ->where('program_id', $p->id)
                    ->where('fee_type', 'program')
                    ->min('month_year');

                $startMonthRaw = $earliestRecordMonth ?: ($enrolledDate ? substr($enrolledDate, 0, 7) : null);
                $startMonth = $this->formatToBsMonthString($startMonthRaw);

                if ($startMonth && $startMonth < $requestedMonth) {
                    $existingPriorRecords = StudentFee::where('student_id', $studentId)
                        ->where('program_id', $p->id)
                        ->where('fee_type', 'program')
                        ->where('month_year', '<', $requestedMonth)
                        ->get()
                        ->groupBy('month_year');

                    $currentPointer = $startMonth;
                    while ($currentPointer < $requestedMonth) {
                        $mStr = $currentPointer;

                        if (isset($existingPriorRecords[$mStr])) {
                            $dueRows = $existingPriorRecords[$mStr];
                            $netTotal  = $dueRows->sum(fn($r) => (float)$r->total_amount);
                            $paidTotal = $dueRows->sum(fn($r) => (float)$r->paid_amount);
                            $outstanding = max(0, $netTotal - $paidTotal);

                            if ($outstanding > 0.01) {
                                $firstRow = $dueRows->first();
                                $breakdown[] = [
                                    'id'                   => $p->id,
                                    'title'                => $p->title,
                                    'program_fee'          => ($firstRow && (float)$firstRow->program_fee > 0) ? (float)$firstRow->program_fee : $fee,
                                    'paid_amount'          => $paidTotal,
                                    'last_payment_amount'  => 0,
                                    'discount'             => $firstRow ? (float)($firstRow->program_discount ?? 0) : $monthlyDiscount,
                                    'discount_type'        => $firstRow ? ($firstRow->program_discount_type ?? 'cash') : $monthlyDiscountType,
                                    'status'               => 'pending',
                                    'billing_mode'         => $billingMode,
                                    'monthly_discount'     => $monthlyDiscount,
                                    'monthly_discount_type'=> $monthlyDiscountType,
                                    'due_month'            => $mStr,
                                ];
                            }
                        } else {
                            // Unrecorded past month between startMonth and requestedMonth
                            $breakdown[] = [
                                'id'                   => $p->id,
                                'title'                => $p->title,
                                'program_fee'          => $fee,
                                'paid_amount'          => 0,
                                'last_payment_amount'  => 0,
                                'discount'             => $monthlyDiscount,
                                'discount_type'        => $monthlyDiscountType,
                                'status'               => 'pending',
                                'billing_mode'         => $billingMode,
                                'monthly_discount'     => $monthlyDiscount,
                                'monthly_discount_type'=> $monthlyDiscountType,
                                'due_month'            => $mStr,
                            ];
                        }

                        $currentPointer = $this->getNextMonthString($currentPointer);
                    }
                }
            } elseif ($requestedMonth && in_array($billingMode, ['fixed', 'duration'])) {
                $priorDues = StudentFee::where('student_id', $studentId)
                    ->where('program_id', $p->id)
                    ->where('fee_type', 'program')
                    ->where('month_year', '<', $requestedMonth)
                    ->whereRaw('(total_amount - paid_amount) > 0.01')
                    ->orderBy('month_year')
                    ->get()
                    ->groupBy('month_year');

                foreach ($priorDues as $priorMonth => $dueRows) {
                    $firstRow = $dueRows->first();
                    $outstanding = $dueRows->sum(fn($r) => (float)$r->total_amount - (float)$r->paid_amount);
                    if ($outstanding > 0.01) {
                        $breakdown[] = [
                            'id'                   => $p->id,
                            'title'                => $p->title,
                            'program_fee'          => ($firstRow && (float)$firstRow->program_fee > 0) ? (float)$firstRow->program_fee : $fee,
                            'paid_amount'          => $dueRows->sum(fn($r) => (float)$r->paid_amount),
                            'last_payment_amount'  => 0,
                            'discount'             => $firstRow ? (float)($firstRow->program_discount ?? 0) : 0,
                            'discount_type'        => $firstRow ? ($firstRow->program_discount_type ?? 'cash') : 'cash',
                            'status'               => 'pending',
                            'billing_mode'         => $billingMode,
                            'monthly_discount'     => 0,
                            'monthly_discount_type'=> 'cash',
                            'due_month'            => $priorMonth,
                        ];
                    }
                }
            }

            if (!$skipCurrentRow) {
                // Current-month row
                $progFeeVal = $fee;
                $progDiscVal = $billingMode === 'monthly' ? $monthlyDiscount : 0;
                $progDiscTypeVal = $billingMode === 'monthly' ? $monthlyDiscountType : 'cash';

                if ($existing) {
                    if ((float)$existing->program_fee > 0) {
                        $progFeeVal = (float)$existing->program_fee;
                    } elseif ((float)$existing->total_amount > 0) {
                        $progFeeVal = (float)$existing->total_amount + (float)($existing->program_discount ?? 0);
                    }
                    $progDiscVal = (float)($existing->program_discount ?? 0);
                    $progDiscTypeVal = $existing->program_discount_type ?? 'cash';
                }

                $breakdown[] = [
                    'id'                   => $p->id,
                    'title'                => $p->title,
                    'program_fee'          => $progFeeVal,
                    'paid_amount'          => $existing ? (float) $existing->paid_amount : 0,
                    'last_payment_amount'  => $existing ? (float) $existing->last_payment_amount : 0,
                    'discount'             => $progDiscVal,
                    'discount_type'        => $progDiscTypeVal,
                    'status'               => $existing ? $existing->status : 'pending',
                    'billing_mode'         => $billingMode,
                    'monthly_discount'     => $monthlyDiscount,
                    'monthly_discount_type'=> $monthlyDiscountType,
                    'due_month'            => null, // null = current month
                ];

                // Project future advance months if requested
                $advanceCount = (int) $request->query('advance_months', 0);
                if ($advanceCount > 0 && $requestedMonth && $billingMode === 'monthly') {
                    $advPointer = $this->getNextMonthString($requestedMonth);
                    for ($i = 0; $i < $advanceCount; $i++) {
                        $advMonthStr = $advPointer;

                        $advExisting = StudentFee::where('student_id', $studentId)
                            ->where('program_id', $p->id)
                            ->where('fee_type', 'program')
                            ->where('month_year', $advMonthStr)
                            ->first();

                        $breakdown[] = [
                            'id'                   => $p->id,
                            'title'                => $p->title,
                            'program_fee'          => ($advExisting && (float)$advExisting->program_fee > 0) ? (float)$advExisting->program_fee : $fee,
                            'paid_amount'          => $advExisting ? (float) $advExisting->paid_amount : 0,
                            'last_payment_amount'  => $advExisting ? (float) $advExisting->last_payment_amount : 0,
                            'discount'             => $advExisting ? (float) $advExisting->program_discount : $monthlyDiscount,
                            'discount_type'        => $advExisting ? ($advExisting->program_discount_type ?? 'cash') : $monthlyDiscountType,
                            'status'               => $advExisting ? $advExisting->status : 'pending',
                            'billing_mode'         => $billingMode,
                            'monthly_discount'     => $monthlyDiscount,
                            'monthly_discount_type'=> $monthlyDiscountType,
                            'due_month'            => $advMonthStr,
                            'is_advance'           => true,
                        ];

                        $advPointer = $this->getNextMonthString($advPointer);
                    }
                }
            }
        }

        // Handle unmatched legacy classes
        if ($enrollments->isEmpty() && !empty($classTitles)) {
            foreach ($classTitles as $originalTitle) {
                if (!in_array(strtolower($originalTitle), $matchedTitles)) {
                    $unmatched[] = $originalTitle;
                }
            }
        }

        // "Most descriptive" admission record for month
        $admissionMonthRecord = $monthRecords->where('fee_type', 'admission')->where('admission_discount', '>', 0)->first()
            ?? $monthRecords->where('fee_type', 'admission')->where('admission_fee', '>', 0)->first()
            ?? $monthRecords->where('fee_type', 'admission')->first();

        $programFees = [
            'admission_fee'     => $admissionAmount,
            'program_fee'       => collect($breakdown)->where('due_month', null)->sum('program_fee'),
            'paid_amount'       => collect($breakdown)->where('due_month', null)->sum('paid_amount'),
            'discount'          => collect($breakdown)->where('due_month', null)->sum('discount'),
            'programs_breakdown'=> $breakdown,
        ];

        return response()->json([
            'message' => 'Student fee info fetched',
            'data' => [
                'student' => [
                    'id'      => $studentId,
                    'name'    => $student->name,
                    'classes' => $student->classes,
                    'shift'   => $student->shift,
                ],
                'admission_paid'         => $admissionPaid,
                'admission_exists'       => $admissionExists,
                'admission_amount'       => $admissionAmount,
                'admission_paid_amount'  => $admissionPaidAmount,
                'admission_last_payment' => $admissionRecord ? (float) $admissionRecord->last_payment_amount : 0,
                'admission_discount'     => $admissionMonthRecord ? $monthRecords->where('fee_type', 'admission')->sum('admission_discount') : 0,
                'admission_discount_type'=> $admissionMonthRecord ? $admissionMonthRecord->admission_discount_type : 'cash',
                'global_admission_fee'   => $globalAdmissionFee,
                'program_fees'           => $programFees,
                'breakdown'              => $breakdown,
                'unmatched'              => $unmatched,
                'period_record'          => $monthRecords->first(),
                'payments'               => $monthRecords->sortByDesc('created_at')->values(),
            ]
        ]);
    }


    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id'     => 'required|exists:students,id',
            'fee_type'       => 'required|in:admission,program,billing',
            'month_year'     => 'required|string|regex:/^\d{4}-\d{2}$/',
            'payment_method' => 'nullable|string',
            'remarks'        => 'nullable|string',
            'shift'          => 'nullable|string',
            'fee_items'      => 'required|array|min:1',
            'fee_items.*.type'          => 'required|in:admission,program',
            'fee_items.*.program_id'    => 'required_if:fee_items.*.type,program|nullable|exists:programs,id',
            'fee_items.*.month_year'    => 'required|string|regex:/^\d{4}-\d{2}$/',
            'fee_items.*.base_amount'   => 'required|numeric|min:0',
            'fee_items.*.discount'      => 'required|numeric|min:0',
            'fee_items.*.discount_type' => 'required|in:cash,percentage',
            'fee_items.*.paying_now'    => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $studentId = $request->student_id;
        $paymentMethod = $request->payment_method ?? 'Cash';
        $remarks = $request->remarks;
        $isUpdate = filter_var($request->is_update, FILTER_VALIDATE_BOOLEAN);

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($studentId, $paymentMethod, $remarks, $isUpdate, $request) {
                foreach ($request->fee_items as $item) {
                    $type = $item['type'];
                    $targetMonth = $item['month_year'];
                    $baseAmount = (float) $item['base_amount'];
                    $discount = (float) $item['discount'];
                    $discountType = $item['discount_type'];
                    $payingNow = (float) $item['paying_now'];
                    $programId = $type === 'program' ? $item['program_id'] : null;

                    // Calculate net amount for this item
                    $netAmount = $discountType === 'percentage'
                        ? max(0, $baseAmount - ($baseAmount * $discount / 100))
                        : max(0, $baseAmount - $discount);

                    // Find or instantiate the canonical row - using firstOrNew to prevent duplicate race conditions
                    $feeRecord = StudentFee::firstOrNew([
                        'student_id' => $studentId,
                        'month_year' => $targetMonth,
                        'fee_type'   => $type,
                        'program_id' => $programId,
                    ]);

                    if (!$feeRecord->exists) {
                        $feeRecord->paid_amount = 0;
                    }

                    // If isUpdate is true, we overwrite the paid amount, otherwise we incrementally add it
                    $existingPaid = (float) $feeRecord->paid_amount;
                    $newPaid = $isUpdate ? $payingNow : $existingPaid + $payingNow;
                    $rawReturn = $newPaid - $netAmount;
                    $returnAmount = $rawReturn > 1.01 ? round($rawReturn, 2) : 0;

                    // Populate type-specific billing fields
                    if ($type === 'admission') {
                        $feeRecord->admission_fee = $baseAmount;
                        $feeRecord->admission_discount = $discount;
                        $feeRecord->admission_discount_type = $discountType;
                        $feeRecord->admission_paid = ($newPaid - $returnAmount) >= $netAmount;
                        $feeRecord->program_fee = 0;
                        $feeRecord->program_discount = 0;
                        $feeRecord->program_discount_type = 'cash';
                    } else {
                        $feeRecord->program_fee = $baseAmount;
                        $feeRecord->program_discount = $discount;
                        $feeRecord->program_discount_type = $discountType;
                        $feeRecord->admission_fee = 0;
                        $feeRecord->admission_discount = 0;
                        $feeRecord->admission_discount_type = 'cash';
                        $feeRecord->admission_paid = false;
                    }

                    $feeRecord->total_amount = $netAmount;
                    $feeRecord->net_amount = $netAmount;
                    $feeRecord->paid_amount = min($newPaid, $netAmount);
                    $feeRecord->last_payment_amount = $payingNow;
                    $feeRecord->return_amount = $returnAmount;
                    $feeRecord->pending_amount = max(0, $netAmount - $feeRecord->paid_amount);
                    $feeRecord->status = $feeRecord->pending_amount <= 0.01 ? 'paid' : 'pending';
                    $feeRecord->payment_method = $paymentMethod;
                    $feeRecord->remarks = $remarks;
                    $feeRecord->save();
                }

                return response()->json(['message' => 'Fees processed successfully'], 201);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Catch unique constraint violation (error code 23000 in SQL standard or containing duplicate entry)
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate entry')) {
                return response()->json([
                    'message' => 'A payment record for this student program and month already exists. Please refresh and try again.'
                ], 409);
            }
            throw $e;
        }
    }

    public function update(Request $request, $id)
    {
        $reproFee = StudentFee::find($id);

        $request->merge([
            'student_id' => $reproFee ? $reproFee->student_id : $request->student_id,
            'month_year' => $reproFee ? $reproFee->month_year : $request->month_year,
            'is_update'  => true,
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

    private function formatToBsMonthString(?string $dateStr): ?string
    {
        if (!$dateStr) return null;
        $parts = explode('-', $dateStr);
        if (count($parts) < 2) return $dateStr;
        $y = (int)$parts[0];
        if ($y >= 2050) {
            return sprintf('%04d-%02d', $y, (int)$parts[1]);
        }

        try {
            $fullDate = count($parts) >= 3 ? $dateStr : $dateStr . '-15';
            $carbon = \Carbon\Carbon::parse($fullDate);
            $adM = $carbon->month;
            $adY = $carbon->year;
            if ($adM >= 4) {
                $bsY = $adY + 57;
                $bsM = $adM - 3;
            } else {
                $bsY = $adY + 56;
                $bsM = $adM + 9;
            }
            return sprintf('%04d-%02d', $bsY, $bsM);
        } catch (\Exception $e) {
            return $dateStr;
        }
    }

    private function getNextMonthString(string $mStr): string
    {
        $parts = explode('-', $mStr);
        if (count($parts) < 2) return $mStr;
        $y = (int) $parts[0];
        $m = (int) $parts[1];
        $m++;
        if ($m > 12) {
            $m = 1;
            $y++;
        }
        return sprintf('%04d-%02d', $y, $m);
    }
}


