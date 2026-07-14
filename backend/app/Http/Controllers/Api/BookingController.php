<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Program;
use App\Models\ProgramSchedule;
use App\Models\Instructor;
use App\Models\InstructorAvailability;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookingController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // Helper: convert "HH:MM" or "HH:MM:SS" → integer minutes since midnight
    // ─────────────────────────────────────────────────────────────────────────
    private function toMinutes(?string $time): ?int
    {
        if (!$time) return null;
        $parts = explode(':', $time);
        return (int)$parts[0] * 60 + (int)$parts[1];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: subtract booked intervals from free segments (minute integers)
    // ─────────────────────────────────────────────────────────────────────────
    private function subtractInterval(array $segments, int $bookedStart, int $bookedEnd): array
    {
        $result = [];
        foreach ($segments as [$segStart, $segEnd]) {
            if ($bookedEnd <= $segStart || $bookedStart >= $segEnd) {
                $result[] = [$segStart, $segEnd]; // no overlap
                continue;
            }
            if ($segStart < $bookedStart) $result[] = [$segStart, $bookedStart]; // left slice
            if ($bookedEnd  < $segEnd)   $result[] = [$bookedEnd,  $segEnd];     // right slice
        }
        return $result;
    }

    /**
     * Compute dynamically remaining free segments for an instructor OR
     * all free segments for basic display.
     */
    public function computeFreeSegments(int $instructorId, ?int $excludeBookingId = null): array
    {
        // 1. Raw availability ranges
        $availabilities = InstructorAvailability::where('instructor_id', $instructorId)
            ->where('is_available', true)
            ->orderBy('start_time')
            ->get(['start_time', 'end_time']);

        $acceptedBookings = Booking::where('instructor_id', $instructorId)
            ->where('status', 'accepted')
            ->when($excludeBookingId, fn($q) => $q->where('id', '!=', $excludeBookingId))
            ->with(['schedules', 'schedule'])
            ->get();

        // Collect all booked intervals as [startMin, endMin]
        $bookedIntervals = [];
        foreach ($acceptedBookings as $booking) {
            if ($booking->type === 'customization' && $booking->custom_start_time && $booking->custom_end_time) {
                $bookedIntervals[] = [
                    $this->toMinutes(substr($booking->custom_start_time, 0, 5)),
                    $this->toMinutes(substr($booking->custom_end_time, 0, 5)),
                ];
            } elseif ($booking->type === 'regular') {
                $schedules = $booking->schedules && $booking->schedules->isNotEmpty()
                    ? $booking->schedules
                    : collect([$booking->schedule])->filter();
                foreach ($schedules as $s) {
                    $bookedIntervals[] = [
                        $this->toMinutes(substr($s->start_time, 0, 5)),
                        $this->toMinutes(substr($s->end_time, 0, 5)),
                    ];
                }
            }
        }

        // Sort booked intervals by start time
        usort($bookedIntervals, fn($a, $b) => $a[0] <=> $b[0]);

        $freeSegments = [];
        foreach ($availabilities as $avail) {
            $availStart = $this->toMinutes(substr($avail->start_time, 0, 5));
            $availEnd   = $this->toMinutes(substr($avail->end_time, 0, 5));
            $segments   = [[$availStart, $availEnd]];

            foreach ($bookedIntervals as [$bs, $be]) {
                $segments = $this->subtractInterval($segments, $bs, $be);
                if (empty($segments)) break;
            }

            foreach ($segments as [$segStart, $segEnd]) {
                if ($segEnd - $segStart >= 5) { // ignore slivers < 5 min
                    $freeSegments[] = [$segStart, $segEnd];
                }
            }
        }

        usort($freeSegments, fn($a, $b) => $a[0] <=> $b[0]);
        
        $mergedFree = [];
        foreach ($freeSegments as $seg) {
            if (empty($mergedFree)) {
                $mergedFree[] = $seg;
            } else {
                $last = &$mergedFree[count($mergedFree) - 1];
                if ($seg[0] <= $last[1]) {
                    $last[1] = max($last[1], $seg[1]);
                } else {
                    $mergedFree[] = $seg;
                }
            }
        }

        $mergedBooked = [];
        foreach ($bookedIntervals as $seg) {
            if (empty($mergedBooked)) {
                $mergedBooked[] = $seg;
            } else {
                $last = &$mergedBooked[count($mergedBooked) - 1];
                if ($seg[0] <= $last[1]) {
                    $last[1] = max($last[1], $seg[1]);
                } else {
                    $mergedBooked[] = $seg;
                }
            }
        }

        return [
            'free_segments'   => $mergedFree,
            'booked_segments' => $mergedBooked,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: convert int minutes → "HH:MM"
    // ─────────────────────────────────────────────────────────────────────────
    private function fromMinutes(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: check if two time intervals overlap (minute-based)
    // Returns true if [aStart, aEnd) overlaps [bStart, bEnd)
    // ─────────────────────────────────────────────────────────────────────────
    private function overlaps(int $aStart, int $aEnd, int $bStart, int $bEnd): bool
    {
        return $aStart < $bEnd && $aEnd > $bStart;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/bookings
    // ─────────────────────────────────────────────────────────────────────────
    public function index()
    {
        $bookings = Booking::with(['program', 'schedules.instructor', 'schedule.instructor', 'instructor'])
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data'    => $bookings
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/bookings
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'program_id'       => 'required|exists:programs,id',
            'schedule_id'      => 'nullable|exists:program_schedules,id',
            'schedule_ids'     => 'nullable|array',
            'schedule_ids.*'   => 'exists:program_schedules,id',
            'instructor_id'    => 'nullable|exists:instructors,id',
            'booking_date'     => 'required|date',
            'name'             => 'required|string|max:255',
            'phone'            => 'required|string|max:20',
            'email'            => 'nullable|email',
            'address'          => 'nullable|string|max:255',
            'message'          => 'nullable|string',
            'class_mode'       => 'required|in:online,physical',
            'type'             => 'required|in:regular,customization',
            'custom_start_time'=> 'nullable|date_format:H:i',
            'custom_end_time'  => 'nullable|date_format:H:i|after:custom_start_time',
            'duration_value'   => 'nullable|integer|min:1',
            'duration_unit'    => 'nullable|in:days,months,years',
        ], [
            'booking_date.required' => 'Preferred Start Date is required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors()
            ], 422);
        }

        $booking = Booking::create($validator->validated());

        if ($request->has('schedule_ids')) {
            $booking->schedules()->sync($request->schedule_ids);
        }

        $booking->load(['program', 'schedules', 'instructor']);

        return response()->json([
            'success' => true,
            'message' => 'Booking created successfully',
            'data'    => $booking
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/bookings/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function show($id)
    {
        $booking = Booking::with(['program', 'schedules.instructor', 'schedule.instructor', 'instructor'])->find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $booking
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/bookings/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $booking = Booking::find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'program_id'       => 'nullable|exists:programs,id',
            'schedule_id'      => 'nullable|exists:program_schedules,id',
            'instructor_id'    => 'nullable|exists:instructors,id',
            'booking_date'     => 'nullable|date',
            'name'             => 'nullable|string|max:255',
            'phone'            => 'nullable|string|max:20',
            'email'            => 'nullable|email',
            'address'          => 'nullable|string|max:255',
            'message'          => 'nullable|string',
            'class_mode'       => 'nullable|in:online,physical',
            'type'             => 'nullable|in:regular,customization',
            'custom_start_time'=> 'nullable|date_format:H:i',
            'custom_end_time'  => 'nullable|date_format:H:i',
            'duration_value'   => 'nullable|integer|min:1',
            'duration_unit'    => 'nullable|in:days,months,years',
            'status'           => 'nullable|in:pending,accepted,rejected,completed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors()
            ], 422);
        }

        $booking->update($validator->validated());

        if ($request->has('schedule_ids')) {
            $booking->schedules()->sync($request->schedule_ids);
        }

        $booking->load(['program', 'schedules.instructor', 'schedule.instructor', 'instructor']);

        return response()->json([
            'success' => true,
            'message' => 'Booking updated successfully',
            'data'    => $booking
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH /api/bookings/{id}/status
    // ─────────────────────────────────────────────────────────────────────────
    public function updateStatus(Request $request, $id)
    {
        $booking = Booking::find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status'             => 'required|in:pending,accepted,rejected,completed',
            'instructor_id'      => 'nullable|exists:instructors,id',
            'custom_start_time'  => 'nullable|date_format:H:i',
            'custom_end_time'    => 'nullable|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors()
            ], 422);
        }

        $booking->status = $request->status;
        if ($request->has('instructor_id')) {
            $booking->instructor_id = $request->instructor_id;
        }
        // Allow admin to adjust the agreed time when accepting a customization booking
        if ($request->filled('custom_start_time')) {
            $booking->custom_start_time = $request->custom_start_time;
        }
        if ($request->filled('custom_end_time')) {
            $booking->custom_end_time = $request->custom_end_time;
        }
        $booking->save();

        $booking->load(['program', 'schedule.instructor', 'schedules.instructor', 'instructor']);

        return response()->json([
            'success' => true,
            'message' => 'Booking status updated successfully',
            'data'    => $booking
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/bookings/{id}/available-instructors
    // ─────────────────────────────────────────────────────────────────────────
    public function availableInstructors($id)
    {
        $booking = Booking::with(['program', 'schedules.instructor', 'schedule.instructor'])->find($id);
        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        }

        $bookingDate = $booking->booking_date;

        // Get linked instructors for this program
        $scheduleInstructorIds = ProgramSchedule::where('program_id', $booking->program_id)
            ->whereNotNull('instructor_id')
            ->pluck('instructor_id');

        $pivotInstructorIds = $booking->program->instructors()->pluck('instructors.id');

        $linkedInstructorIds = $scheduleInstructorIds->concat($pivotInstructorIds)
            ->unique()
            ->values();

        // Collect slots to check
        $slotsToCheck = [];

        if ($booking->type === 'regular') {
            $schedules = $booking->schedules->isNotEmpty()
                ? $booking->schedules
                : collect([$booking->schedule])->filter();

            if ($schedules->isEmpty() && $booking->program) {
                $schedules = $booking->program->schedules;
            }

            foreach ($schedules as $s) {
                $slotsToCheck[] = [
                    'start_min' => $this->toMinutes(substr($s->start_time instanceof \DateTimeInterface ? $s->start_time->format('H:i') : $s->start_time, 0, 5)),
                    'end_min'   => $this->toMinutes(substr($s->end_time instanceof \DateTimeInterface ? $s->end_time->format('H:i') : $s->end_time, 0, 5)),
                    'start'     => substr($s->start_time, 0, 5),
                    'end'       => substr($s->end_time, 0, 5),
                ];
            }
        } else {
            $csStart = $booking->custom_start_time instanceof \DateTimeInterface
                ? $booking->custom_start_time->format('H:i')
                : substr($booking->custom_start_time, 0, 5);
            $csEnd = $booking->custom_end_time instanceof \DateTimeInterface
                ? $booking->custom_end_time->format('H:i')
                : substr($booking->custom_end_time, 0, 5);

            $slotsToCheck[] = [
                'start_min' => $this->toMinutes($csStart),
                'end_min'   => $this->toMinutes($csEnd),
                'start'     => $csStart,
                'end'       => $csEnd,
            ];
        }

        if (empty($slotsToCheck)) {
            return response()->json(['success' => false, 'message' => 'Booking time information is missing'], 400);
        }

        $instructors = Instructor::whereIn('id', $linkedInstructorIds)
            ->select('id', 'name', 'title', 'image')
            ->get();

        foreach ($instructors as $instructor) {
            $isFullyAvailable = true;

            // Compute dynamically remaining free segments and booked segments for this instructor
            $computedInfo = $this->computeFreeSegments($instructor->id, $id);
            $rawFreeSegments = $computedInfo['free_segments'];
            $rawBookedSegments = $computedInfo['booked_segments'];

            // Format free_slots for UI display
            $freeSlots = array_map(fn($seg) => [
                'day'   => 'Daily',
                'start' => $this->fromMinutes($seg[0]),
                'end'   => $this->fromMinutes($seg[1]),
            ], $rawFreeSegments);

            // Format booked_slots for UI display
            $bookedSlots = array_map(fn($seg) => [
                'day'   => 'Daily',
                'start' => $this->fromMinutes($seg[0]),
                'end'   => $this->fromMinutes($seg[1]),
            ], $rawBookedSegments);

            foreach ($slotsToCheck as $slot) {
                if (!$isFullyAvailable) break;

                $slotStart = $slot['start_min'];
                $slotEnd   = $slot['end_min'];

                // 1. Check: is the requested slot fully covered by a free segment?
                $fitsInFreeSlot = false;
                foreach ($rawFreeSegments as [$segStart, $segEnd]) {
                    if ($segStart <= $slotStart && $segEnd >= $slotEnd) {
                        $fitsInFreeSlot = true;
                        break;
                    }
                }

                if (!$fitsInFreeSlot) {
                    // Also check raw availability (for regular bookings with lead instructor)
                    $rawAvails = InstructorAvailability::where('instructor_id', $instructor->id)
                        ->where('is_available', true)
                        ->get(['start_time', 'end_time']);

                    $inRawAvail = false;
                    foreach ($rawAvails as $ra) {
                        $raStart = $this->toMinutes(substr($ra->start_time, 0, 5));
                        $raEnd   = $this->toMinutes(substr($ra->end_time, 0, 5));
                        if ($raStart <= $slotStart && $raEnd >= $slotEnd) {
                            $inRawAvail = true;
                            break;
                        }
                    }

                    if (!$inRawAvail) {
                        $isFullyAvailable = false;
                        continue;
                    }

                    // Check booking conflicts (accepted bookings overlap the slot)
                    $hasConflict = Booking::where('instructor_id', $instructor->id)
                        ->where('status', 'accepted')
                        ->where('id', '!=', $booking->id)
                        ->where(function ($q) use ($slot) {
                            $q->where(function ($sq) use ($slot) {
                                $sq->whereNull('custom_start_time')
                                   ->whereHas('schedules', function ($ssq) use ($slot) {
                                       $ssq->whereRaw('TIME(start_time) < TIME(?)', [$slot['end']])
                                           ->whereRaw('TIME(end_time) > TIME(?)', [$slot['start']]);
                                   });
                            })->orWhere(function ($sq) use ($slot) {
                                $sq->whereNotNull('custom_start_time')
                                   ->whereRaw('TIME(custom_start_time) < TIME(?)', [$slot['end']])
                                   ->whereRaw('TIME(custom_end_time) > TIME(?)', [$slot['start']]);
                            });
                        })
                        ->exists();

                    if ($hasConflict) {
                        $isFullyAvailable = false;
                    }
                }
            }

            $instructor->is_available = $isFullyAvailable;
            $instructor->free_slots   = $freeSlots;
            $instructor->booked_slots = $bookedSlots;
        }

        // Sort: fully available first, then has free_slots, then unavailable
        $sorted = $instructors->sortByDesc(function ($inst) {
            if ($inst->is_available)             return 2;
            if (count($inst->free_slots) > 0)    return 1;
            return 0;
        })->values();

        return response()->json([
            'success' => true,
            'data'    => $sorted,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/bookings/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function destroy($id)
    {
        $booking = Booking::find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        $booking->delete();

        return response()->json([
            'success' => true,
            'message' => 'Booking deleted successfully'
        ]);
    }
}