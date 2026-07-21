<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with([
            'enrollments.program',
            'enrollments.booking.instructor',
            'enrollments.booking.schedules',
            'enrollments.booking.schedule'
        ])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        $students = $query->paginate(10);

        foreach ($students as $student) {
            $student->image_url = $student->image ? asset('storage/' . $student->image) : null;
        }

        return response()->json([
            'message' => 'Students fetched successfully',
            'data' => $students
        ]);
    }

    public function store(Request $request)
    {
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'roll_no' => 'nullable|string|max:255',
            'phone' => 'required|string|max:20',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:10240',
            'dob' => 'nullable|date',
            'address' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'time' => 'nullable|string',
            'offer_enroll_reference' => 'nullable|string',
            'gender' => 'nullable|string',
            'classes' => 'nullable|string',
            'status' => 'nullable|in:active,inactive,graduated',
            'enrollment_date' => 'nullable|date',
            'admission_fee_not_required' => 'nullable|boolean',
            'duration_value' => 'nullable|numeric|min:0',
            'duration_unit' => 'nullable|string',
            'enrollments' => 'nullable|array',
            'enrollments.*.program_id' => 'required|exists:programs,id',
            'enrollments.*.booking_id' => 'nullable|exists:bookings,id',
            'enrollments.*.instructor_id' => 'nullable|exists:instructors,id',
            'enrollments.*.schedule_id' => 'nullable|exists:program_schedules,id',
            'enrollments.*.schedule_ids' => 'nullable|array',
            'enrollments.*.type' => 'nullable|in:regular,customization',
            'enrollments.*.status' => 'nullable|in:active,inactive,graduated',
            'enrollments.*.custom_start_time' => 'nullable|date_format:H:i',
            'enrollments.*.custom_end_time' => 'nullable|date_format:H:i',
            'enrollments.*.custom_fee' => 'nullable|numeric|min:0',
            'enrollments.*.billing_mode' => 'nullable|in:duration,monthly,fixed',
            'enrollments.*.monthly_discount' => 'nullable|numeric|min:0',
            'enrollments.*.monthly_discount_type' => 'nullable|in:cash,percentage',
            'enrollments.*.duration_value' => 'nullable|integer|min:1',
            'enrollments.*.duration_unit' => 'nullable|string|in:months,years',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('students', 'public');
        }

        $student = Student::create($data);

        // 1. Handle Admission Fee Record
        $setting = \App\Models\Setting::first();
        $admissionFee = $setting ? (float) ($setting->admission_fee ?? 0) : 0;

        if ($admissionFee > 0 && !$student->admission_fee_not_required) {
            \App\Models\StudentFee::create([
                'student_id' => $student->id,
                'fee_type' => 'admission',
                'total_amount' => $admissionFee,
                'paid_amount' => 0,
                'pending_amount' => $admissionFee,
                'status' => 'pending',
                'admission_fee' => $admissionFee,
                'month_year' => request()->input('fee_month_year') ?: date('Y-m'),
                'payment_method' => 'Cash',
                'remarks' => '',
            ]);
        }

        // 2. Handle Program Enrollments & Fees
        $this->syncProgramsAndFees($student, $request->enrollments ?? []);

        return response()->json([
            'message' => 'Student created successfully',
            'data' => $student
        ], 201);
    }

    public function show($id)
    {
        $student = Student::with([
            'fees',
            'enrollments.program',
            'enrollments.booking.instructor',
            'enrollments.booking.schedules'
        ])->findOrFail($id);

        $student->image_url = $student->image ? asset('storage/' . $student->image) : null;

        return response()->json([
            'data' => $student
        ]);
    }

    public function update(Request $request, $id)
    {
        $student = Student::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'roll_no' => 'nullable|string|max:255',
            'phone' => 'sometimes|required|string|max:20',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:10240',
            'dob' => 'nullable|date',
            'address' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'time' => 'nullable|string',
            'offer_enroll_reference' => 'nullable|string',
            'gender' => 'nullable|string',
            'classes' => 'nullable|string',
            'status' => 'nullable|in:active,inactive,graduated',
            'enrollment_date' => 'nullable|date',
            'admission_fee_not_required' => 'nullable|boolean',
            'duration_value' => 'nullable|numeric|min:0',
            'duration_unit' => 'nullable|string',
            'enrollments' => 'nullable|array',
            'enrollments.*.program_id' => 'required|exists:programs,id',
            'enrollments.*.booking_id' => 'nullable|exists:bookings,id',
            'enrollments.*.instructor_id' => 'nullable|exists:instructors,id',
            'enrollments.*.schedule_id' => 'nullable|exists:program_schedules,id',
            'enrollments.*.schedule_ids' => 'nullable|array',
            'enrollments.*.type' => 'nullable|in:regular,customization',
            'enrollments.*.status' => 'nullable|in:active,inactive,graduated',
            'enrollments.*.custom_start_time' => 'nullable|date_format:H:i',
            'enrollments.*.custom_end_time' => 'nullable|date_format:H:i',
            'enrollments.*.custom_fee' => 'nullable|numeric|min:0',
            'enrollments.*.billing_mode' => 'nullable|in:duration,monthly,fixed',
            'enrollments.*.monthly_discount' => 'nullable|numeric|min:0',
            'enrollments.*.monthly_discount_type' => 'nullable|in:cash,percentage',
            'enrollments.*.duration_value' => 'nullable|integer|min:1',
            'enrollments.*.duration_unit' => 'nullable|string|in:months,years',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if ($request->hasFile('image')) {
            if ($student->image) {
                Storage::disk('public')->delete($student->image);
            }
            $data['image'] = $request->file('image')->store('students', 'public');
        }

        $student->update($data);

        // Handle transitioning admission fee exemption status
        if ($student->admission_fee_not_required) {
            \App\Models\StudentFee::where('student_id', $student->id)
                ->where('fee_type', 'admission')
                ->where('status', 'pending')
                ->delete();
        } else {
            $setting = \App\Models\Setting::first();
            $admissionFee = $setting ? (float) ($setting->admission_fee ?? 0) : 0;
            if ($admissionFee > 0) {
                $exists = \App\Models\StudentFee::where('student_id', $student->id)
                    ->where('fee_type', 'admission')
                    ->exists();
                if (!$exists) {
                    \App\Models\StudentFee::create([
                        'student_id' => $student->id,
                        'fee_type' => 'admission',
                        'total_amount' => $admissionFee,
                        'paid_amount' => 0,
                        'pending_amount' => $admissionFee,
                        'status' => 'pending',
                        'admission_fee' => $admissionFee,
                        'month_year' => request()->input('fee_month_year') ?: date('Y-m'),
                        'payment_method' => 'Cash',
                        'remarks' => '',
                    ]);
                }
            }
        }

        // If classes or enrollments were updated, sync enrollments and generate missing fees
        if (isset($data['classes']) || isset($data['enrollments'])) {
            $this->syncProgramsAndFees($student, $request->enrollments ?? []);
        }

        return response()->json([
            'message' => 'Student updated successfully',
            'data' => $student
        ]);
    }

    /**
     * Syncs student_programs table, links to bookings, and auto-generates student_fees records.
     */
    private function syncProgramsAndFees($student, array $enrollmentData = [])
    
    {
        $currentMonth = request()->input('fee_month_year') ?: date('Y-m');
        $studentStatus = $student->status;

        // 1. Determine which programs we are dealing with
        $programIdsToSync = [];

        if (!empty($enrollmentData)) {
            $programIdsToSync = array_column($enrollmentData, 'program_id');
        } elseif (!empty($student->classes)) {
            $classTitles = array_map('trim', array_filter(explode(',', $student->classes)));
            $programIdsToSync = \App\Models\Program::where('is_active', true)
                ->where(function ($q) use ($classTitles) {
                    foreach ($classTitles as $title) {
                        $q->orWhereRaw('LOWER(title) = ?', [strtolower($title)]);
                    }
                })
                ->pluck('id')
                ->toArray();
        }

        // 2. Remove programs no longer in the list
        $oldEnrollments = \App\Models\StudentProgram::where('student_id', $student->id)
            ->whereNotIn('program_id', $programIdsToSync)
            ->get();

        foreach ($oldEnrollments as $oe) {
            // Delete related shadow booking if it exists
            if ($oe->booking_id) {
                \App\Models\Booking::where('id', $oe->booking_id)->delete();
            }
            $oe->delete();
        }

        // 3. Sync each program
        foreach ($programIdsToSync as $pId) {
            $prog = \App\Models\Program::find($pId);
            if (!$prog)
                continue;

            // Find enrollment info for this program. Loose comparison handles string vs int IDs from request.
            $enrollInfo = collect($enrollmentData)->first(fn($item) => (int) ($item['program_id'] ?? 0) === (int) $pId) ?? [];

            $spStatus = $enrollInfo['status'] ??
                ($studentStatus === 'graduated' ? 'graduated' :
                    ($studentStatus === 'inactive' ? 'inactive' : 'active'));

            $customFee = (isset($enrollInfo['custom_fee']) && $enrollInfo['custom_fee'] !== '') ? (float)$enrollInfo['custom_fee'] : null;
            $commPct = (isset($enrollInfo['commission_percentage']) && $enrollInfo['commission_percentage'] !== '') ? (float)$enrollInfo['commission_percentage'] : null;

            $sp = \App\Models\StudentProgram::updateOrCreate(
                ['student_id' => $student->id, 'program_id' => $pId],
                [
                    'status'               => $spStatus,
                    'custom_fee'           => $customFee,
                    'commission_percentage'=> $commPct,
                    'billing_mode'         => $enrollInfo['billing_mode'] ?? 'duration',
                    'monthly_discount'     => (isset($enrollInfo['monthly_discount']) && $enrollInfo['monthly_discount'] !== '') ? (float)$enrollInfo['monthly_discount'] : 0,
                    'monthly_discount_type'=> $enrollInfo['monthly_discount_type'] ?? 'cash',
                    'duration_value'       => (isset($enrollInfo['duration_value']) && $enrollInfo['duration_value'] !== '') ? (int)$enrollInfo['duration_value'] : null,
                    'duration_unit'        => $enrollInfo['duration_unit'] ?? null,
                ]
            );

            // Handle Shadow Booking to block instructor's time
            // Only 'active' status blocks the instructor; graduated or inactive frees it.
            $bookingStatus = ($spStatus === 'active' ? 'accepted' : 'completed');

            $bookingData = [
                'student_id' => $student->id,
                'program_id' => $pId,
                'status' => $bookingStatus,
                'booking_date' => $student->enrollment_date ?: date('Y-m-d'),
                'name' => $student->name,
                'phone' => $student->phone,
                'email' => $student->email,
                'address' => $student->address,
                'class_mode' => 'physical', // default
                'type' => $enrollInfo['type'] ?? 'regular',
                'instructor_id' => !empty($enrollInfo['instructor_id']) ? $enrollInfo['instructor_id'] : null,
                'schedule_id' => !empty($enrollInfo['schedule_id']) ? $enrollInfo['schedule_id'] : null,
                'custom_start_time' => !empty($enrollInfo['custom_start_time']) ? $enrollInfo['custom_start_time'] : null,
                'custom_end_time' => !empty($enrollInfo['custom_end_time']) ? $enrollInfo['custom_end_time'] : null,
            ];

            $booking = null;
            if ($sp->booking_id || !empty($enrollInfo['booking_id'])) {
                $bId = $sp->booking_id ?: $enrollInfo['booking_id'];
                $booking = \App\Models\Booking::find($bId);
                if ($booking) {
                    $booking->update($bookingData);
                } else {
                    $booking = \App\Models\Booking::create($bookingData);
                }
                $sp->update(['booking_id' => $booking->id]);
            } elseif (
                ($enrollInfo['type'] ?? 'regular') === 'customization' || 
                !empty($enrollInfo['schedule_ids']) || 
                !empty($enrollInfo['instructor_id']) || 
                !empty($enrollInfo['schedule_id'])
            ) {
                // Create a shadow booking for customization OR if specific schedules/instructors are selected.
                // Regular types with no specific schedule selection don't need a shadow booking.
                $booking = \App\Models\Booking::create($bookingData);
                $sp->update(['booking_id' => $booking->id]);
            }

            // Sync schedule_ids if provided (for programs with multiple slots)
            if ($booking && isset($enrollInfo['schedule_ids']) && is_array($enrollInfo['schedule_ids'])) {
                $booking->schedules()->sync($enrollInfo['schedule_ids']);
            }

            // 4. Handle Fees (auto-generate for all billing modes: duration, monthly, and fixed)
            $billingMode = $sp->billing_mode ?? 'duration';
            $baseFee = ($sp->custom_fee !== null && (float)$sp->custom_fee > 0) ? (float) $sp->custom_fee : (float) ($prog->program_fee ?? 0);

            $discount = 0;
            $discountType = 'cash';

            if ($billingMode === 'duration') {
                $multiplier = 1;
                $val = $sp->duration_value ?? $student->duration_value;
                $unit = $sp->duration_unit ?? $student->duration_unit;
                if ($val && $unit) {
                    $valFloat = (float) $val;
                    if ($unit === 'months') {
                        $multiplier = $valFloat;
                    } elseif ($unit === 'years') {
                        $multiplier = $valFloat * 12;
                    }
                }
                $feeAmount = $baseFee * $multiplier;
                $netAmount = $feeAmount;
            } elseif ($billingMode === 'monthly') {
                $feeAmount = $baseFee;
                $discount = (float) ($sp->monthly_discount ?? 0);
                $discountType = $sp->monthly_discount_type ?? 'cash';
                $netAmount = $discountType === 'percentage'
                    ? max(0, $feeAmount - ($feeAmount * $discount / 100))
                    : max(0, $feeAmount - $discount);
            } else { // fixed
                $feeAmount = $baseFee;
                $netAmount = $feeAmount;
            }

            $existingRecord = null;
            if (in_array($billingMode, ['duration', 'fixed'])) {
                $existingRecord = \App\Models\StudentFee::where('student_id', $student->id)
                    ->where('program_id', $pId)
                    ->where('fee_type', 'program')
                    ->first();
            }

            if (in_array($billingMode, ['duration', 'fixed'])) {
                if (!$existingRecord) {
                    \App\Models\StudentFee::create([
                        'student_id'    => $student->id,
                        'program_id'    => $pId,
                        'fee_type'      => 'program',
                        'total_amount'  => $netAmount,
                        'paid_amount'   => 0,
                        'pending_amount'=> $netAmount,
                        'status'        => 'pending',
                        'program_fee'   => $feeAmount,
                        'program_discount' => $discount,
                        'program_discount_type' => $discountType,
                        'month_year'    => $currentMonth,
                        'payment_method'=> 'Cash',
                        'remarks'       => '',
                    ]);
                } else {
                    if (abs($feeAmount - (float)$existingRecord->program_fee) > 0.01) {
                        $existingRecord->update([
                            'program_fee'   => $feeAmount,
                            'total_amount'  => $netAmount,
                            'pending_amount'=> max(0, $netAmount - (float)$existingRecord->paid_amount),
                        ]);
                        $existingRecord->status = $existingRecord->pending_amount <= 0.01 ? 'paid' : 'pending';
                        $existingRecord->save();
                    }
                }
            } else {
                $existingBase = \App\Models\StudentFee::where('student_id', $student->id)
                    ->where('program_id', $pId)
                    ->where('month_year', $currentMonth)
                    ->sum('program_fee');

                if ($existingBase <= 0) {
                    // No fee yet, create it
                    \App\Models\StudentFee::create([
                        'student_id'    => $student->id,
                        'program_id'    => $pId,
                        'fee_type'      => 'program',
                        'total_amount'  => $netAmount,
                        'paid_amount'   => 0,
                        'pending_amount'=> $netAmount,
                        'status'        => 'pending',
                        'program_fee'   => $feeAmount,
                        'program_discount' => $discount,
                        'program_discount_type' => $discountType,
                        'month_year'    => $currentMonth,
                        'payment_method'=> 'Cash',
                        'remarks'       => '',
                    ]);
                } elseif (abs($feeAmount - $existingBase) > 0.01) {
                    // Fee changed — update the existing pending record for this month
                    // (never INSERT a second row; the unique index only allows one per
                    //  student+program+fee_type+month_year combination)
                    $pendingRecord = \App\Models\StudentFee::where('student_id', $student->id)
                        ->where('program_id', $pId)
                        ->where('month_year', $currentMonth)
                        ->where('fee_type', 'program')
                        ->where('status', 'pending')
                        ->first();

                    if ($pendingRecord) {
                        $pendingRecord->update([
                            'program_fee'    => $feeAmount,
                            'total_amount'   => $netAmount,
                            'pending_amount' => max(0, $netAmount - (float) $pendingRecord->paid_amount),
                        ]);
                        $pendingRecord->status = $pendingRecord->pending_amount <= 0.01 ? 'paid' : 'pending';
                        $pendingRecord->save();
                    }
                    // If the record is already paid, leave it unchanged to preserve payment history
                }
            }
        }
    }

    public function destroy($id)
    {
        $student = Student::findOrFail($id);

        if ($student->image) {
            Storage::disk('public')->delete($student->image);
        }
        $student->delete();

        return response()->json([
            'message' => 'Student deleted successfully'
        ]);
    }
}
