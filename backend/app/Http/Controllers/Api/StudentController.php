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
            'enrollments.booking.schedules'
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

        if ($admissionFee > 0) {
            \App\Models\StudentFee::create([
                'student_id' => $student->id,
                'fee_type' => 'admission',
                'total_amount' => $admissionFee,
                'paid_amount' => 0,
                'pending_amount' => $admissionFee,
                'status' => 'pending',
                'admission_fee' => $admissionFee,
                'month_year' => date('Y-m'),
                'payment_method' => 'Cash',
                'remarks' => 'Auto-generated admission fee on enrollment',
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
        $currentMonth = date('Y-m');
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
                    'status' => $spStatus,
                    'custom_fee' => $customFee,
                    'commission_percentage' => $commPct,
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

            // 4. Handle Fees
            $baseFee = $sp->custom_fee !== null ? (float) $sp->custom_fee : (float) ($prog->program_fee ?? 0);
            
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
            
            $feeAmount = $baseFee * $multiplier;

            $existingBase = \App\Models\StudentFee::where('student_id', $student->id)
                ->where('program_id', $pId)
                ->where('month_year', $currentMonth)
                ->sum('program_fee');

            if ($existingBase <= 0) {
                // No fee yet, create it
                \App\Models\StudentFee::create([
                    'student_id' => $student->id,
                    'program_id' => $pId,
                    'fee_type' => 'program',
                    'total_amount' => $feeAmount,
                    'paid_amount' => 0,
                    'pending_amount' => $feeAmount,
                    'status' => 'pending',
                    'program_fee' => $feeAmount,
                    'month_year' => $currentMonth,
                    'payment_method' => 'Cash',
                    'remarks' => 'Auto-generated for program enrollment',
                ]);
            } elseif (abs($feeAmount - $existingBase) > 0.01) {
                // Base fee changed (e.g. duration edited), create adjustment record
                $diff = $feeAmount - $existingBase;
                \App\Models\StudentFee::create([
                    'student_id' => $student->id,
                    'program_id' => $pId,
                    'fee_type' => 'program',
                    'total_amount' => $diff,
                    'paid_amount' => 0,
                    'pending_amount' => $diff,
                    'status' => $diff > 0 ? 'pending' : 'paid',
                    'program_fee' => $diff,
                    'month_year' => $currentMonth,
                    'payment_method' => 'Cash',
                    'remarks' => 'Auto-adjustment due to duration change',
                ]);
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
