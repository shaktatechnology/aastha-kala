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
            'employee_id' => [
                'required',
                'exists:employees,id',
                Rule::unique('salary_payments')->where(function ($query) use ($request) {
                    return $query->where('month', $request->month)
                                 ->where('year', $request->year)
                                 ->where('payment_type', $request->payment_type);
                })
            ],
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
            'employee_id.unique' => 'A payment of this type already exists for this employee for the selected month and year.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $payment = SalaryPayment::create($validator->validated());

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
            'employee_id' => [
                'required',
                'exists:employees,id',
                Rule::unique('salary_payments')->where(function ($query) use ($request) {
                    return $query->where('month', $request->month)
                                 ->where('year', $request->year)
                                 ->where('payment_type', $request->payment_type);
                })->ignore($salaryPayment->id)
            ],
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
            'employee_id.unique' => 'A payment of this type already exists for this employee for the selected month and year.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $salaryPayment->update($validator->validated());

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

        if (!$instructor) {
            return response()->json([
                'success' => false,
                'message' => 'Selected employee is not registered as an instructor'
            ], 422);
        }

        // Convert Nepali month/year to AD YYYY-MM
        $monthYearStr = $this->getAdMonthYear($request->month, $request->year);

        $feesQuery = \App\Models\StudentFee::where('month_year', $monthYearStr)
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

        $breakdown = $feeRecords->map(function($record) use ($enrollments, $globalRate, &$totalCollected, &$totalBilled, &$collectedGross, &$billedGross) {
            $key = $record->student_id . '-' . $record->program_id;
            $sp = $enrollments->get($key);
            $customRate = $sp ? $sp->commission_percentage : null;
            $rate = $customRate !== null ? (float) $customRate : $globalRate;

            $billed = (float) $record->total_billed;
            $paid = (float) $record->total_paid;

            $totalBilled += $billed;
            $totalCollected += $paid;

            $billedGross += $billed * ($rate / 100);
            $collectedGross += $paid * ($rate / 100);

            return [
                'student_name' => $record->student ? $record->student->name : 'N/A',
                'program_title' => $record->program ? $record->program->title : 'N/A',
                'billed_amount' => $billed,
                'paid_amount' => $paid,
                'commission_rate' => $rate,
                'is_custom_rate' => $customRate !== null,
            ];
        });

        // Collected calculation: VAT is deducted from gross commission
        $collectedVatCut = $collectedGross * $vatRate;
        $collectedNet = $collectedGross - $collectedVatCut;

        // Billed calculation: VAT is deducted from gross commission
        $billedVatCut = $billedGross * $vatRate;
        $billedNet = $billedGross - $billedVatCut;

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
                'breakdown' => $breakdown,
                'bases' => [
                    'collected' => [
                        'gross_commission' => round($collectedGross, 2),
                        'vat_cut' => round($collectedVatCut, 2),
                        'net_commission' => round($collectedNet, 2),
                    ],
                    'billed' => [
                        'gross_commission' => round($billedGross, 2),
                        'vat_cut' => round($billedVatCut, 2),
                        'net_commission' => round($billedNet, 2),
                    ],
                ]
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
}
