<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalaryPayment;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SalaryPaymentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', SalaryPayment::class);

        $query = SalaryPayment::with('employee');

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('month')) {
            $query->where('month', $request->month);
        }

        if ($request->has('year')) {
            $query->where('year', $request->year);
        }

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->whereHas('employee', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $payments = $query->latest()->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $payments
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', SalaryPayment::class);

        $validator = Validator::make($request->all(), [
            'employee_id' => array_filter([
                'required',
                'exists:employees,id',
                // Only enforce one-per-month for salary and pre-pay types
                in_array($request->payment_type, ['salary', 'pre-pay'])
                    ? Rule::unique('salary_payments')->where(function ($query) use ($request) {
                        return $query->where('month', $request->month)
                                     ->where('year', $request->year)
                                     ->where('payment_type', $request->payment_type);
                      })
                    : null,
            ]),
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer',
            'payment_type' => 'required|string',
            'remarks' => 'nullable|string',
            'commission_gross' => 'nullable|numeric|min:0',
            'commission_vat' => 'nullable|numeric|min:0',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
            'commission_collected_amount' => 'nullable|numeric|min:0',
            'commission_method' => 'nullable|string|max:50',
            'commission_basis' => 'nullable|string|max:50',
        ], [
            'employee_id.unique' => 'A salary/pre-pay payment already exists for this employee for the selected month and year.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $payment = SalaryPayment::create($validator->validated());

        if ($payment->payment_type === 'commission') {
            $this->syncFeeCommissionAllocations($payment);
        }

        return response()->json([
            'success' => true,
            'message' => 'Salary payment recorded successfully',
            'data' => $payment
        ], 201);
    }

    public function show(SalaryPayment $salaryPayment)
    {
        $this->authorize('view', $salaryPayment);

        return response()->json([
            'success' => true,
            'data' => $salaryPayment->load('employee')
        ]);
    }

    public function update(Request $request, SalaryPayment $salaryPayment)
    {
        $this->authorize('update', $salaryPayment);

        $validator = Validator::make($request->all(), [
            'employee_id' => array_filter([
                'required',
                'exists:employees,id',
                // Only enforce one-per-month for salary and pre-pay types
                in_array($request->payment_type, ['salary', 'pre-pay'])
                    ? Rule::unique('salary_payments')->where(function ($query) use ($request) {
                        return $query->where('month', $request->month)
                                     ->where('year', $request->year)
                                     ->where('payment_type', $request->payment_type);
                      })->ignore($salaryPayment->id)
                    : null,
            ]),
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer',
            'payment_type' => 'required|string',
            'remarks' => 'nullable|string',
            'commission_gross' => 'nullable|numeric|min:0',
            'commission_vat' => 'nullable|numeric|min:0',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
            'commission_collected_amount' => 'nullable|numeric|min:0',
            'commission_method' => 'nullable|string|max:50',
            'commission_basis' => 'nullable|string|max:50',
        ], [
            'employee_id.unique' => 'A salary/pre-pay payment already exists for this employee for the selected month and year.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $salaryPayment->update($validator->validated());

        if ($salaryPayment->payment_type === 'commission') {
            $this->syncFeeCommissionAllocations($salaryPayment);
        }

        return response()->json([
            'success' => true,
            'message' => 'Salary payment updated successfully',
            'data' => $salaryPayment
        ]);
    }

    public function destroy(SalaryPayment $salaryPayment)
    {
        $this->authorize('delete', $salaryPayment);

        $salaryPayment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Salary payment deleted successfully'
        ]);
    }

    public function pendingCommissions(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $employee   = Employee::with('instructor')->findOrFail($request->employee_id);
        $instructor = $employee->instructor;
        // Use explicit commission flags instead of salary_basis heuristic
        $isFeeBased    = (bool) $employee->earns_fee_commission;
        $isIncomeBased = $instructor && (bool) $employee->earns_income_commission;

        if (!$isFeeBased && !$isIncomeBased) {
            return response()->json([
                'success' => false,
                'message' => 'This employee is not commission-based'
            ], 422);
        }

        $setting       = \App\Models\Setting::first();
        $vatPercentage = $setting ? (float) $setting->vat_percentage : 13.00;
        $vatRate       = $vatPercentage / 100;

        // Determine current BS month/year from today's AD date
        $adMonth = (int) now()->month;
        $adYear  = (int) now()->year;
        if ($adMonth >= 5) {
            $currentBsMonth = $adMonth - 4;
            $currentBsYear  = $adYear + 57;
        } else {
            $currentBsMonth = $adMonth + 8;
            $currentBsYear  = $adYear + 56;
        }

        // Generate last 12 BS months (newest first)
        $bsMonths = [];
        $bm = $currentBsMonth;
        $by = $currentBsYear;
        for ($i = 0; $i < 12; $i++) {
            $bsMonths[] = ['month' => $bm, 'year' => $by];
            $bm--;
            if ($bm < 1) { $bm = 12; $by--; }
        }

        // Fetch all paid commissions for this employee grouped by month-year
        $paidMap = SalaryPayment::where('employee_id', $employee->id)
            ->where('payment_type', 'commission')
            ->get()
            ->groupBy(fn($p) => $p->month . '-' . $p->year)
            ->map(fn($g) => round((float) $g->sum('amount'), 2));

        $results = [];

        foreach ($bsMonths as $bsMonthData) {
            $month = $bsMonthData['month'];
            $year  = $bsMonthData['year'];
            $key   = $month . '-' . $year;
            $alreadyPaid = (float) ($paidMap->get($key) ?? 0);

            $totalGross = 0.0;
            $totalVat   = 0.0;
            $totalNet   = 0.0;
            $sources    = [];

            if ($isFeeBased) {
                $feeResult = $this->summaryFeeCommission($employee, $instructor, $month, $year, $vatRate);
                if ($feeResult) {
                    $totalGross += $feeResult['gross'];
                    $totalVat   += $feeResult['vat_cut'];
                    $totalNet   += $feeResult['net'];
                    $sources[]   = 'fee';
                }
            }

            if ($isIncomeBased) {
                $incomeResult = $this->summaryIncomeCommission($instructor, $month, $year, $vatRate);
                if ($incomeResult) {
                    $totalGross += $incomeResult['gross'];
                    $totalVat   += $incomeResult['vat_cut'];
                    $totalNet   += $incomeResult['net'];
                    $sources[]   = 'income';
                }
            }

            if ($totalNet < 0.01) continue;

            $remaining = max(0.0, $totalNet - $alreadyPaid);
            if ($remaining < 0.01) continue; // Fully paid

            $results[] = [
                'month'            => $month,
                'year'             => $year,
                'gross_commission' => round($totalGross, 2),
                'vat_cut'          => round($totalVat, 2),
                'net_commission'   => round($totalNet, 2),
                'already_paid'     => round($alreadyPaid, 2),
                'remaining'        => round($remaining, 2),
                'sources'          => $sources,
            ];
        }

        return response()->json([
            'success'        => true,
            'data'           => $results,
            'vat_percentage' => $vatPercentage,
        ]);
    }

    public function bulkCommissionPayout(Request $request)
    {
        $this->authorize('create', SalaryPayment::class);

        $validator = Validator::make($request->all(), [
            'employee_id'          => 'required|exists:employees,id',
            'payment_date'         => 'required|date',
            'payouts'              => 'required|array|min:1',
            'payouts.*.month'      => 'required|integer|between:1,12',
            'payouts.*.year'       => 'required|integer',
            'payouts.*.amount'     => 'required|numeric|min:0.01',
            'payouts.*.remarks'    => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            $created = [];
            foreach ($request->payouts as $payout) {
                $payment = SalaryPayment::create([
                    'employee_id'  => $request->employee_id,
                    'amount'       => $payout['amount'],
                    'payment_date' => $request->payment_date,
                    'month'        => $payout['month'],
                    'year'         => $payout['year'],
                    'payment_type' => 'commission',
                    'remarks'      => $payout['remarks'] ?? 'Bulk commission payout',
                ]);
                $this->syncFeeCommissionAllocations($payment);
                $created[] = $payment;
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($created) . ' commission payment(s) recorded successfully',
                'data'    => $created,
            ], 201);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to record payments: ' . $e->getMessage()
            ], 500);
        }
    }

    private function getMonthYearVariants($bsMonth, $bsYear): array
    {
        $bm = (int) $bsMonth;
        $by = (int) $bsYear;

        $bsFormatted = sprintf('%04d-%02d', $by, $bm);
        $bsRaw       = sprintf('%d-%d', $by, $bm);

        $adMonthYearStr = $this->getAdMonthYear($bm, $by);
        [$adYear, $adMonth] = explode('-', $adMonthYearStr);
        $adRaw = sprintf('%d-%d', (int)$adYear, (int)$adMonth);

        return array_values(array_unique([$bsFormatted, $bsRaw, $adMonthYearStr, $adRaw]));
    }

    /** Summary fee commission for a single month (collected basis, global rate), deducting prior claimed fee commissions. */
    private function summaryFeeCommission(Employee $employee, $instructor, int $bsMonth, int $bsYear, float $vatRate): ?array
    {
        if (!$instructor) return null;

        $variants = $this->getMonthYearVariants($bsMonth, $bsYear);

        $fees = \App\Models\StudentFee::whereIn('month_year', $variants)
            ->where('fee_type', 'program')
            ->whereExists(function ($query) use ($instructor) {
                $query->select(\Illuminate\Support\Facades\DB::raw(1))
                    ->from('student_programs')
                    ->whereColumn('student_programs.student_id', 'student_fees.student_id')
                    ->whereColumn('student_programs.program_id', 'student_fees.program_id')
                    ->where(function ($spQ) use ($instructor) {
                        $spQ->where(function ($bq) use ($instructor) {
                            $bq->whereExists(function ($sub) use ($instructor) {
                                $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                                    ->from('bookings')
                                    ->whereColumn('bookings.id', 'student_programs.booking_id')
                                    ->where(function ($bi) use ($instructor) {
                                        $bi->where('bookings.instructor_id', $instructor->id)
                                           ->orWhereExists(function ($bs) use ($instructor) {
                                               $bs->select(\Illuminate\Support\Facades\DB::raw(1))
                                                  ->from('booking_schedule')
                                                  ->join('program_schedules', 'program_schedules.id', '=', 'booking_schedule.program_schedule_id')
                                                  ->whereColumn('booking_schedule.booking_id', 'bookings.id')
                                                  ->where('program_schedules.instructor_id', $instructor->id);
                                           })
                                           ->orWhereExists(function ($bsch) use ($instructor) {
                                               $bsch->select(\Illuminate\Support\Facades\DB::raw(1))
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
                                       $pi->select(\Illuminate\Support\Facades\DB::raw(1))
                                          ->from('program_instructor')
                                          ->whereColumn('program_instructor.program_id', 'student_programs.program_id')
                                          ->where('program_instructor.instructor_id', $instructor->id);
                                   })
                                   ->orWhereExists(function ($ps) use ($instructor) {
                                       $ps->select(\Illuminate\Support\Facades\DB::raw(1))
                                          ->from('program_schedules')
                                          ->whereColumn('program_schedules.program_id', 'student_programs.program_id')
                                          ->where('program_schedules.instructor_id', $instructor->id);
                                   });
                               });
                        });
                    });
            })
            ->get();

        if ($fees->isEmpty()) return null;

        $globalRate = (float) $employee->percentage;
        $totalGross = 0.0;

        foreach ($fees as $fee) {
            if (!$fee->program_id || (float)$fee->paid_amount < 0.01) continue;

            $priorClaimedGross = (float) \App\Models\SalaryPaymentStudentFee::where('student_id', $fee->student_id)
                ->where('program_id', $fee->program_id)
                ->whereIn('month_year', $variants)
                ->sum('gross_commission');

            $sp = \App\Models\StudentProgram::where('student_id', $fee->student_id)
                ->where('program_id', $fee->program_id)
                ->first();

            $rate = ($sp && $sp->commission_percentage !== null)
                ? (float) $sp->commission_percentage
                : $globalRate;

            $fullGross = (float) $fee->paid_amount * ($rate / 100);
            $availableGross = max(0.0, $fullGross - $priorClaimedGross);
            $totalGross += $availableGross;
        }

        if ($totalGross < 0.01) return null;

        $vatCut = $totalGross * $vatRate;
        $net    = $totalGross - $vatCut;

        return ['gross' => $totalGross, 'vat_cut' => $vatCut, 'net' => $net];
    }

    /** Summary income commission for a single BS month. */
    private function summaryIncomeCommission($instructor, int $bsMonth, int $bsYear, float $vatRate): ?array
    {
        $gross = (float) \App\Models\CompanyIncome::where('instructor_id', $instructor->id)
            ->where('month', $bsMonth)
            ->where('year', $bsYear)
            ->whereNotNull('commission_percentage')
            ->selectRaw('SUM(amount * commission_percentage / 100) as total_commission')
            ->value('total_commission');

        if ($gross < 0.01) return null;

        $vatCut = $gross * $vatRate;
        $net    = $gross - $vatCut;

        return ['gross' => $gross, 'vat_cut' => $vatCut, 'net' => $net];
    }

    public function calculateCommission(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $employeeId = $request->employee_id;
        $month = (int) $request->month;
        $year = (int) $request->year;

        $employee = Employee::with('instructor')->findOrFail($employeeId);
        $instructor = $employee->instructor;

        // Guard: employee must have fee commission enabled
        if (!$employee->earns_fee_commission) {
            return response()->json([
                'success' => false,
                'message' => 'Fee-based commission is not enabled for this employee'
            ], 422);
        }

        if (!$instructor) {
            return response()->json([
                'success' => false,
                'message' => 'Selected employee is not registered as an instructor'
            ], 422);
        }

        // Get all possible month_year variants (BS formatted e.g. 2083-04, BS raw 2083-4, AD formatted e.g. 2026-08, AD raw 2026-8)
        $monthYearVariants = $this->getMonthYearVariants($month, $year);
        $monthYearStr = $this->getAdMonthYear($month, $year);

        $feesQuery = \App\Models\StudentFee::whereIn('month_year', $monthYearVariants)
            ->where('fee_type', 'program')
            ->whereExists(function ($query) use ($instructor) {
                $query->select(\Illuminate\Support\Facades\DB::raw(1))
                    ->from('student_programs')
                    ->whereColumn('student_programs.student_id', 'student_fees.student_id')
                    ->whereColumn('student_programs.program_id', 'student_fees.program_id')
                    ->where(function ($spQuery) use ($instructor) {
                        $spQuery->where(function ($bq) use ($instructor) {
                            $bq->whereExists(function ($sub) use ($instructor) {
                                $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                                    ->from('bookings')
                                    ->whereColumn('bookings.id', 'student_programs.booking_id')
                                    ->where(function ($bi) use ($instructor) {
                                        $bi->where('bookings.instructor_id', $instructor->id)
                                           ->orWhereExists(function ($bs) use ($instructor) {
                                               $bs->select(\Illuminate\Support\Facades\DB::raw(1))
                                                  ->from('booking_schedule')
                                                  ->join('program_schedules', 'program_schedules.id', '=', 'booking_schedule.program_schedule_id')
                                                  ->whereColumn('booking_schedule.booking_id', 'bookings.id')
                                                  ->where('program_schedules.instructor_id', $instructor->id);
                                           })
                                           ->orWhereExists(function ($bsch) use ($instructor) {
                                               $bsch->select(\Illuminate\Support\Facades\DB::raw(1))
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
                                       $pi->select(\Illuminate\Support\Facades\DB::raw(1))
                                          ->from('program_instructor')
                                          ->whereColumn('program_instructor.program_id', 'student_programs.program_id')
                                          ->where('program_instructor.instructor_id', $instructor->id);
                                   })
                                   ->orWhereExists(function ($ps) use ($instructor) {
                                       $ps->select(\Illuminate\Support\Facades\DB::raw(1))
                                          ->from('program_schedules')
                                          ->whereColumn('program_schedules.program_id', 'student_programs.program_id')
                                          ->where('program_schedules.instructor_id', $instructor->id);
                                   });
                               });
                        });
                    });
            });


        // 1. Consolidated fee records by student and program
        $feeRecords = $feesQuery->with('student', 'program')
            ->select('student_id', 'program_id')
            ->selectRaw('SUM(total_amount) as total_billed')
            ->selectRaw('SUM(paid_amount) as total_paid')
            ->groupBy('student_id', 'program_id')
            ->get();

        // 2. Fetch enrollment info to get student-program-specific commission percentages
        $enrollments = \App\Models\StudentProgram::whereIn('student_id', $feeRecords->pluck('student_id'))
            ->whereIn('program_id', $feeRecords->pluck('program_id'))
            ->get()
            ->keyBy(function($item) {
                return $item->student_id . '-' . $item->program_id;
            });

        $setting = \App\Models\Setting::first();
        $vatPercentage = $setting ? (float) $setting->vat_percentage : 13.00;
        $vatRate = $vatPercentage / 100;
        $globalRate = (float) $employee->percentage;

        $totalCollected = 0.00;
        $totalBilled = 0.00;

        $collectedGross = 0.00;
        $billedGross = 0.00;

        $breakdown = $feeRecords->map(function($record) use ($enrollments, $globalRate, $monthYearVariants, &$totalCollected, &$totalBilled, &$collectedGross, &$billedGross) {
            $key = $record->student_id . '-' . $record->program_id;
            $sp = $enrollments->get($key);
            $customRate = $sp ? $sp->commission_percentage : null;
            $rate = $customRate !== null ? (float) $customRate : $globalRate;

            $billed = (float) $record->total_billed;
            $paid = (float) $record->total_paid;

            // Deduct prior claimed gross commission for this student-program in this month
            $priorClaimedGross = (float) \App\Models\SalaryPaymentStudentFee::where('student_id', $record->student_id)
                ->where('program_id', $record->program_id)
                ->whereIn('month_year', $monthYearVariants)
                ->sum('gross_commission');

            $fullBilledGross    = $billed * ($rate / 100);
            $fullCollectedGross = $paid * ($rate / 100);

            $availCollectedGross = max(0.0, $fullCollectedGross - $priorClaimedGross);
            $availBilledGross    = max(0.0, $fullBilledGross - $priorClaimedGross);

            $totalBilled += $billed;
            $totalCollected += $paid;

            $billedGross += $availBilledGross;
            $collectedGross += $availCollectedGross;

            return [
                'student_name'        => $record->student ? $record->student->name : 'N/A',
                'program_title'       => $record->program ? $record->program->title : 'N/A',
                'billed_amount'       => $billed,
                'paid_amount'         => $paid,
                'commission_rate'     => $rate,
                'is_custom_rate'      => $customRate !== null,
                'prior_claimed_gross' => round($priorClaimedGross, 2),
            ];
        });

        // Collected calculation: VAT is deducted from gross commission
        $collectedVatCut = $collectedGross * $vatRate;
        $collectedNet = $collectedGross - $collectedVatCut;

        // Billed calculation: VAT is deducted from gross commission
        $billedVatCut = $billedGross * $vatRate;
        $billedNet = $billedGross - $billedVatCut;

        // Already paid commission this month
        $alreadyPaid = \App\Models\SalaryPayment::where('employee_id', $employeeId)
            ->where('month', $month)
            ->where('year', $year)
            ->where('payment_type', 'commission')
            ->sum('amount');
        $alreadyPaid = round((float) $alreadyPaid, 2);

        return response()->json([
            'success' => true,
            'data' => [
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'percentage' => $globalRate,
                ],
                'vat_percentage' => $vatPercentage,
                'month_year' => $monthYearStr,
                'total_collected' => round($totalCollected, 2),
                'total_billed' => round($totalBilled, 2),
                'already_paid' => $alreadyPaid,
                'breakdown' => $breakdown,
                'bases' => [
                    'collected' => [
                        'gross_commission' => round($collectedGross, 2),
                        'vat_cut' => round($collectedVatCut, 2),
                        'net_commission' => round($collectedNet, 2),
                        'remaining' => round(max(0, $collectedNet - $alreadyPaid), 2),
                    ],
                    'billed' => [
                        'gross_commission' => round($billedGross, 2),
                        'vat_cut' => round($billedVatCut, 2),
                        'net_commission' => round($billedNet, 2),
                        'remaining' => round(max(0, $billedNet - $alreadyPaid), 2),
                    ],
                ]
            ]
        ]);
    }

    public function calculateCommissionFromIncome(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'month'       => 'required|integer|between:1,12',
            'year'        => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors()
            ], 422);
        }

        $employee   = Employee::with('instructor')->findOrFail($request->employee_id);
        $instructor = $employee->instructor;

        // Guard: employee must have income commission enabled
        if (!$employee->earns_income_commission) {
            return response()->json([
                'success' => false,
                'message' => 'Income-based commission is not enabled for this employee'
            ], 422);
        }

        if (!$instructor) {
            return response()->json([
                'success' => false,
                'message' => 'Selected employee is not registered as an instructor'
            ], 422);
        }

        $month = (int) $request->month;
        $year  = (int) $request->year;

        $setting       = \App\Models\Setting::first();
        $vatPercentage = $setting ? (float) $setting->vat_percentage : 13.00;
        $vatRate       = $vatPercentage / 100;

        // Fetch company income records for this instructor in the given BS month/year
        $incomes = \App\Models\CompanyIncome::where('instructor_id', $instructor->id)
            ->where('month', $month)
            ->where('year', $year)
            ->whereNotNull('commission_percentage')
            ->get();

        if ($incomes->isEmpty()) {
            return response()->json([
                'success' => true,
                'data'    => null,
                'message' => 'No company income records with commission found for this instructor in the selected month.'
            ]);
        }

        $totalIncome      = 0.00;
        $totalCommission  = 0.00;

        $breakdown = $incomes->map(function ($income) use (&$totalIncome, &$totalCommission) {
            $amount     = (float) ($income->amount ?? 0);
            $commPct    = (float) ($income->commission_percentage ?? 0);
            $commAmt    = $amount * ($commPct / 100);

            $totalIncome     += $amount;
            $totalCommission += $commAmt;

            return [
                'payer_name'            => $income->payer_name ?? '—',
                'amount'                => $amount,
                'commission_percentage' => $commPct,
                'commission_amount'     => round($commAmt, 2),
                'income_date'           => $income->income_date,
                'bill_number'           => $income->bill_number,
            ];
        });

        $vatCut = $totalCommission * $vatRate;
        $net    = $totalCommission - $vatCut;

        // Already paid commission this month
        $alreadyPaid = \App\Models\SalaryPayment::where('employee_id', $employee->id)
            ->where('month', $month)
            ->where('year', $year)
            ->where('payment_type', 'commission')
            ->sum('amount');
        $alreadyPaid = round((float) $alreadyPaid, 2);
        $remaining   = round(max(0, $net - $alreadyPaid), 2);

        return response()->json([
            'success' => true,
            'data'    => [
                'employee' => [
                    'id'   => $employee->id,
                    'name' => $employee->name,
                ],
                'vat_percentage'   => $vatPercentage,
                'total_income'     => round($totalIncome, 2),
                'gross_commission' => round($totalCommission, 2),
                'vat_cut'          => round($vatCut, 2),
                'net_commission'   => round($net, 2),
                'already_paid'     => $alreadyPaid,
                'remaining'        => $remaining,
                'breakdown'        => $breakdown,
            ]
        ]);
    }

    private function getAdMonthYear($bm, $by)
    {
        if ($bm >= 1 && $bm <= 8) {
            $adM = $bm + 4;
            $adY = $by - 57;
        } else {
            $adM = $bm - 8;
            $adY = $by - 56;
        }
        return sprintf('%d-%02d', $adY, $adM);
    }


    private function calculateSingleOption($feeAmount, $percentage, $vatRate)
    {
        $pct = $percentage / 100;
        $vatFraction = $vatRate / 100;

        $gross = $feeAmount * $pct;
        $vatCut = $gross * $vatFraction;
        $net = $gross - $vatCut;

        return [
            'gross_commission' => round($gross, 2),
            'vat_cut' => round($vatCut, 2),
            'net_commission' => round($net, 2),
        ];
    }

    public function getStoredYears()
    {
        $years = SalaryPayment::distinct()->orderBy('year', 'desc')->pluck('year');
        return response()->json([
            'success' => true,
            'data' => $years
        ]);
    }

    private function syncFeeCommissionAllocations(SalaryPayment $payment): void
    {
        \App\Models\SalaryPaymentStudentFee::where('salary_payment_id', $payment->id)->delete();

        if ($payment->payment_type !== 'commission') return;

        $employee = Employee::with('instructor')->find($payment->employee_id);
        if (!$employee || !$employee->instructor || !$employee->earns_fee_commission) return;

        $instructor = $employee->instructor;
        $bsMonth = (int) $payment->month;
        $bsYear = (int) $payment->year;

        $variants = $this->getMonthYearVariants($bsMonth, $bsYear);
        $setting = \App\Models\Setting::first();
        $vatPercentage = $setting ? (float) $setting->vat_percentage : 13.00;
        $vatRate = $vatPercentage / 100;
        $globalRate = (float) ($employee->percentage ?? 0);

        $fees = \App\Models\StudentFee::whereIn('month_year', $variants)
            ->where('fee_type', 'program')
            ->whereExists(function ($query) use ($instructor) {
                $query->select(\Illuminate\Support\Facades\DB::raw(1))
                    ->from('student_programs')
                    ->whereColumn('student_programs.student_id', 'student_fees.student_id')
                    ->whereColumn('student_programs.program_id', 'student_fees.program_id')
                    ->where(function ($spQ) use ($instructor) {
                        $spQ->where(function ($bq) use ($instructor) {
                            $bq->whereExists(function ($sub) use ($instructor) {
                                $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                                    ->from('bookings')
                                    ->whereColumn('bookings.id', 'student_programs.booking_id')
                                    ->where(function ($bi) use ($instructor) {
                                        $bi->where('bookings.instructor_id', $instructor->id)
                                           ->orWhereExists(function ($bs) use ($instructor) {
                                               $bs->select(\Illuminate\Support\Facades\DB::raw(1))
                                                  ->from('booking_schedule')
                                                  ->join('program_schedules', 'program_schedules.id', '=', 'booking_schedule.program_schedule_id')
                                                  ->whereColumn('booking_schedule.booking_id', 'bookings.id')
                                                  ->where('program_schedules.instructor_id', $instructor->id);
                                           })
                                           ->orWhereExists(function ($bsch) use ($instructor) {
                                               $bsch->select(\Illuminate\Support\Facades\DB::raw(1))
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
                                       $pi->select(\Illuminate\Support\Facades\DB::raw(1))
                                          ->from('program_instructor')
                                          ->whereColumn('program_instructor.program_id', 'student_programs.program_id')
                                          ->where('program_instructor.instructor_id', $instructor->id);
                                   })
                                   ->orWhereExists(function ($ps) use ($instructor) {
                                       $ps->select(\Illuminate\Support\Facades\DB::raw(1))
                                          ->from('program_schedules')
                                          ->whereColumn('program_schedules.program_id', 'student_programs.program_id')
                                          ->where('program_schedules.instructor_id', $instructor->id);
                                   });
                               });
                        });
                    });
            })
            ->get();

        foreach ($fees as $fee) {
            if (!$fee->program_id || (float)$fee->paid_amount < 0.01) continue;

            $sp = \App\Models\StudentProgram::where('student_id', $fee->student_id)
                ->where('program_id', $fee->program_id)
                ->first();

            $rate = ($sp && $sp->commission_percentage !== null)
                ? (float) $sp->commission_percentage
                : $globalRate;

            $gross = (float) $fee->paid_amount * ($rate / 100);
            $net   = $gross - ($gross * $vatRate);

            if ($gross > 0) {
                \App\Models\SalaryPaymentStudentFee::create([
                    'salary_payment_id' => $payment->id,
                    'student_fee_id'    => $fee->id,
                    'student_id'        => $fee->student_id,
                    'program_id'        => $fee->program_id,
                    'month_year'        => $fee->month_year,
                    'gross_commission'  => round($gross, 2),
                    'net_commission'    => round($net, 2),
                ]);
            }
        }
    }
}
