<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Instructor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class InstructorController extends Controller
{
    // GET /api/instructors
    public function index()
    {
        $instructors = Instructor::whereHas('employee', function($query) {
                $query->where('type', 'instructor')->where('status', true);
            })
            ->with(['availabilities', 'programs', 'employee'])
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $instructors
        ]);
    }

    // POST /api/instructors
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'about' => 'required|string',
            'facebook_url' => 'nullable|url',
            'instagram_url' => 'nullable|url',
            'email' => 'required|email|unique:instructors,email',
            'phone' => 'required|string|max:20',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'availabilities' => 'nullable|array',
            'availabilities.*.day_of_week' => 'required|string|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'availabilities.*.start_time' => 'required|date_format:H:i',
            'availabilities.*.end_time' => 'required|date_format:H:i|after:availabilities.*.start_time',
            'program_ids' => 'nullable|array',
            'program_ids.*' => 'exists:programs,id',
            'device_user_id' => 'nullable|string|unique:employees,device_user_id',
        ], [], [
            'availabilities.*.start_time' => 'start time',
            'availabilities.*.end_time' => 'end time',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only([
            'name',
            'title',
            'about',
            'facebook_url',
            'instagram_url',
            'email',
            'phone'
        ]);

        $data['about'] = is_string($data['about']) ? $data['about'] : null;
        $data['facebook_url'] = is_string($data['facebook_url']) ? $data['facebook_url'] : null;
        $data['instagram_url'] = is_string($data['instagram_url']) ? $data['instagram_url'] : null;

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('instructors', 'public');
            $data['image'] = asset('storage/' . $path);
        }

        // Create the underlying Employee record required for attendance and device sync
        $employee = \App\Models\Employee::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'type' => 'instructor',
            'status' => true,
            'device_user_id' => $request->device_user_id,
            'salary_basis' => 'none',
        ]);

        $data['employee_id'] = $employee->id;
        $instructor = Instructor::create($data);

        // Queue registration for ZKT device via ADMS if device_user_id is provided
        if (!empty($employee->device_user_id)) {
            $deviceName = str_replace(' ', '_', $employee->name); 
            \App\Models\DeviceCommand::create([
                'command' => "DATA USER PIN={$employee->device_user_id}\tName={$deviceName}\tPri=0\tPassword=\tGroup=1\tCard=0"
            ]);
        }

        if ($request->has('availabilities')) {
            foreach ($request->availabilities as $avail) {
                $instructor->availabilities()->create([
                    'day_of_week' => $avail['day_of_week'],
                    'start_time' => $avail['start_time'],
                    'end_time' => $avail['end_time'],
                    'is_available' => true
                ]);
            }
        }

        if ($request->has('program_ids')) {
            $instructor->programs()->sync($request->program_ids);
        }

        return response()->json([
            'success' => true,
            'message' => 'Instructor created successfully',
            'data' => $instructor
        ], 201);
    }

    // GET /api/instructors/{id}
    public function show($id)
    {
        $instructor = Instructor::with(['availabilities', 'programs', 'employee'])->find($id);

        if (!$instructor) {
            return response()->json([
                'success' => false,
                'message' => 'Instructor not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $instructor
        ]);
    }

    // PUT/PATCH /api/instructors/{id}
public function update(Request $request, $id)
{
    $instructor = Instructor::find($id);

    if (!$instructor) {
        return response()->json([
            'success' => false,
            'message' => 'Instructor not found'
        ], 404);
    }

    $validator = Validator::make($request->all(), [
        'name' => 'required|string|max:255',
        'title' => 'required|string|max:255',
        'about' => 'required|string',
        'facebook_url' => 'nullable|url',
        'instagram_url' => 'nullable|url',
        'email' => 'required|email|unique:instructors,email,' . $id,
        'phone' => 'required|string|max:20',
        'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
        'remove_image' => 'nullable|in:1',
        'availabilities' => 'nullable|array',
        'availabilities.*.day_of_week' => 'required|string|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
        'availabilities.*.start_time' => 'required|date_format:H:i',
        'availabilities.*.end_time' => 'required|date_format:H:i|after:availabilities.*.start_time',
        'program_ids' => 'nullable|array',
        'program_ids.*' => 'exists:programs,id',
        'device_user_id' => 'nullable|string|unique:employees,device_user_id,' . ($instructor->employee_id ?? 'NULL'),
    ], [], [
        'availabilities.*.start_time' => 'start time',
        'availabilities.*.end_time' => 'end time',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation errors',
            'errors' => $validator->errors()
        ], 422);
    }

    $data = $request->only([
        'name',
        'title',
        'about',
        'facebook_url',
        'instagram_url',
        'email',
        'phone'
    ]);

    $data['about'] = is_string($data['about']) ? $data['about'] : null;
    $data['facebook_url'] = is_string($data['facebook_url']) ? $data['facebook_url'] : null;
    $data['instagram_url'] = is_string($data['instagram_url']) ? $data['instagram_url'] : null;

    
    if ($request->has('remove_image') && $request->remove_image == '1') {
        if ($instructor->image) {
            $oldPath = str_replace(asset('storage/'), '', $instructor->image);
            Storage::disk('public')->delete($oldPath);
        }

        $data['image'] = null;
    }

    
    if ($request->hasFile('image')) {
        
        if ($instructor->image) {
            $oldPath = str_replace(asset('storage/'), '', $instructor->image);
            Storage::disk('public')->delete($oldPath);
        }

        $path = $request->file('image')->store('instructors', 'public');
        $data['image'] = asset('storage/' . $path);
    }

    $instructor->update($data);

    if ($instructor->employee_id) {
        $employee = \App\Models\Employee::find($instructor->employee_id);
        if ($employee) {
            $employee->update([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'device_user_id' => $request->device_user_id,
            ]);

            if (!empty($request->device_user_id)) {
                $deviceName = str_replace(' ', '_', $employee->name); 
                \App\Models\DeviceCommand::create([
                    'command' => "DATA USER PIN={$request->device_user_id}\tName={$deviceName}\tPri=0\tPassword=\tGroup=1\tCard=0"
                ]);
            }
        }
    } else {
        // Create employee if it doesn't exist for this instructor
        $employee = \App\Models\Employee::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'type' => 'instructor',
            'status' => true,
            'device_user_id' => $request->device_user_id,
            'salary_basis' => 'none',
        ]);
        $instructor->update(['employee_id' => $employee->id]);

        if (!empty($request->device_user_id)) {
            $deviceName = str_replace(' ', '_', $employee->name); 
            \App\Models\DeviceCommand::create([
                'command' => "DATA USER PIN={$request->device_user_id}\tName={$deviceName}\tPri=0\tPassword=\tGroup=1\tCard=0"
            ]);
        }
    }

    if ($request->has('availabilities')) {
        $instructor->availabilities()->delete();
        foreach ($request->availabilities as $avail) {
            $instructor->availabilities()->create([
                'day_of_week' => $avail['day_of_week'],
                'start_time' => $avail['start_time'],
                'end_time' => $avail['end_time'],
                'is_available' => true
            ]);
        }
    }

    if ($request->has('program_ids')) {
        $instructor->programs()->sync($request->program_ids);
    }

    $instructor->load(['availabilities', 'programs']);

    return response()->json([
        'success' => true,
        'message' => 'Instructor updated successfully',
        'data' => $instructor
    ]);
}
    // DELETE /api/instructors/{id}
    public function destroy($id)
    {
        $instructor = Instructor::find($id);

        if (!$instructor) {
            return response()->json([
                'success' => false,
                'message' => 'Instructor not found'
            ], 404);
        }

        
        if ($instructor->image) {
            $oldPath = str_replace(asset('storage/'), '', $instructor->image);
            Storage::disk('public')->delete($oldPath);
        }

        if ($instructor->employee_id) {
            \App\Models\Employee::where('id', $instructor->employee_id)->delete();
        }

        $instructor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Instructor deleted successfully'
        ]);
    }

    private function mapInstructorClasses($instructor)
    {
        $classes = [];

        // 1. Fixed classes
        if ($instructor->fixed_classes) {
            foreach ($instructor->fixed_classes as $class) {
                $program = $class->program;
                
                // If this is a parent program and it has sub-programs, skip its "global" schedule
                if ($program && $program->parent_id === null && $program->subPrograms->isNotEmpty()) {
                    continue;
                }

                $classes[] = [
                    'start_time'    => $class->start_time instanceof \DateTimeInterface ? $class->start_time->format('H:i') : substr($class->start_time, 0, 5),
                    'end_time'      => $class->end_time instanceof \DateTimeInterface ? $class->end_time->format('H:i') : substr($class->end_time, 0, 5),
                    'program_title' => $program ? $program->title : 'Unknown',
                    'parent_program_title' => ($program && $program->parent) ? $program->parent->title : null,
                ];
            }
        }

        // 2. Accepted Bookings
        if ($instructor->bookings) {
            foreach ($instructor->bookings as $booking) {
                if ($booking->status !== 'accepted') continue;

                $program = $booking->program;
                $title = 'Booking: ' . ($program ? $program->title : 'Custom');
                $parentTitle = ($program && $program->parent) ? $program->parent->title : null;

                if ($booking->type === 'regular') {
                    // If this is a parent program and it has sub-programs, skip its "global" schedule
                    if ($program && $program->parent_id === null && $program->subPrograms->isNotEmpty()) {
                        continue;
                    }

                    $schedules = $booking->schedules && $booking->schedules->isNotEmpty() ? $booking->schedules : collect([$booking->schedule])->filter();
                    foreach ($schedules as $s) {
                        $classes[] = [
                            'start_time'    => $s->start_time instanceof \DateTimeInterface ? $s->start_time->format('H:i') : substr($s->start_time, 0, 5),
                            'end_time'      => $s->end_time instanceof \DateTimeInterface ? $s->end_time->format('H:i') : substr($s->end_time, 0, 5),
                            'program_title' => $title,
                            'parent_program_title' => $parentTitle,
                        ];
                    }
                } else {
                    if ($booking->custom_start_time && $booking->custom_end_time) {
                        $classes[] = [
                            'start_time'    => $booking->custom_start_time instanceof \DateTimeInterface ? $booking->custom_start_time->format('H:i') : substr($booking->custom_start_time, 0, 5),
                            'end_time'      => $booking->custom_end_time instanceof \DateTimeInterface ? $booking->custom_end_time->format('H:i') : substr($booking->custom_end_time, 0, 5),
                            'program_title' => $title . ' (Custom)',
                            'parent_program_title' => $parentTitle,
                        ];
                    }
                }
            }
        }

        return collect($classes)->unique(function ($item) {
            return $item['start_time'] . '-' . $item['end_time'] . '-' . $item['program_title'] . '-' . ($item['parent_program_title'] ?? '');
        })->values();
    }

    // GET /api/admin/instructors/{id}/schedule
    public function fullSchedule($id)
    {
        $instructor = Instructor::with(['availabilities', 'fixed_classes.program.subPrograms', 'fixed_classes.program.parent', 'bookings.program.subPrograms', 'bookings.program.parent', 'bookings.schedules', 'bookings.schedule'])->find($id);

        if (!$instructor) {
            return response()->json([
                'success' => false,
                'message' => 'Instructor not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'instructor' => [
                    'id' => $instructor->id,
                    'name' => $instructor->name,
                    'title' => $instructor->title,
                    'image' => $instructor->image,
                ],
                'availabilities' => $instructor->availabilities,
                'classes' => $this->mapInstructorClasses($instructor),
            ]
        ]);
    }
    // GET /api/admin/instructors-schedules
    public function allSchedules()
    {
        $instructors = Instructor::whereHas('employee', function($query) {
                $query->where('type', 'instructor');
            })
            ->with(['availabilities', 'fixed_classes.program.subPrograms', 'fixed_classes.program.parent', 'bookings.program.subPrograms', 'bookings.program.parent', 'bookings.schedules', 'bookings.schedule'])
            ->latest()
            ->paginate(10);

        $instructors->getCollection()->transform(function($instructor) {
            return [
                'instructor' => [
                    'id' => $instructor->id,
                    'name' => $instructor->name,
                    'title' => $instructor->title,
                    'image' => $instructor->image,
                ],
                'availabilities' => $instructor->availabilities,
                'classes' => $this->mapInstructorClasses($instructor),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $instructors
        ]);
    }
    // GET /api/admin/instructors/{id}/check-conflict
    public function checkConflict(Request $request, $id)
    {
        $instructor = Instructor::find($id);
        if (!$instructor) return response()->json(['success'=>false, 'message'=>'Instructor not found'], 404);

        $startTime = $request->start_time;
        $endTime   = $request->end_time;
        $excludeProgramId = $request->exclude_program_id;

        // 1. Availability check (day-agnostic — only check time range)
        $isAvailableWork = \App\Models\InstructorAvailability::where('instructor_id', $id)
            ->where('is_available', true)
            ->whereRaw('TIME(start_time) <= TIME(?)', [$startTime])
            ->whereRaw('TIME(end_time) >= TIME(?)', [$endTime])
            ->exists();

        if (!$isAvailableWork) {
            return response()->json(['conflict' => true, 'message' => 'The teacher is not available at this time slot based on their defined hours.']);
        }

        // 2. Schedule clash check (day-agnostic — only check time overlap)
        $isTeaching = \App\Models\ProgramSchedule::where('instructor_id', $id)
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereRaw('TIME(start_time) < TIME(?)', [$endTime])
                  ->whereRaw('TIME(end_time) > TIME(?)', [$startTime]);
            });

        if ($excludeProgramId) {
            $program = \App\Models\Program::find($excludeProgramId);
            if ($program) {
                $idsToExclude = [$excludeProgramId];
                if ($program->parent_id) $idsToExclude[] = $program->parent_id;
                
                // Also exclude all siblings and children
                $rootId = $program->parent_id ?? $program->id;
                $relatedIds = \App\Models\Program::where('id', $rootId)
                    ->orWhere('parent_id', $rootId)
                    ->pluck('id')
                    ->toArray();
                
                $isTeaching = $isTeaching->whereNotIn('program_id', $relatedIds);
            }
        }

        if ($isTeaching->exists()) {
             return response()->json(['conflict' => true, 'message' => 'The teacher is already teaching another program at this time.']);
        }

        // 3. Booking clash check (day-agnostic — only check time overlap)
        $hasBookingConflict = \App\Models\Booking::where('instructor_id', $id)
            ->where('status', 'accepted')
            ->where(function ($q) use ($startTime, $endTime) {
                // Regular schedules (pivot relation)
                $q->whereHas('schedules', function($sq) use ($startTime, $endTime) {
                     $sq->whereRaw('TIME(start_time) < TIME(?)', [$endTime])
                        ->whereRaw('TIME(end_time) > TIME(?)', [$startTime]);
                })
                // Regular schedules (single relation for strict matching)
                ->orWhereHas('schedule', function($sq) use ($startTime, $endTime) {
                     $sq->whereRaw('TIME(start_time) < TIME(?)', [$endTime])
                        ->whereRaw('TIME(end_time) > TIME(?)', [$startTime]);
                })
                // Custom bookings
                ->orWhere(function($sq) use ($startTime, $endTime) {
                     $sq->whereNotNull('custom_start_time')
                        ->whereRaw('TIME(custom_start_time) < TIME(?)', [$endTime])
                        ->whereRaw('TIME(custom_end_time) > TIME(?)', [$startTime]);
                });
            });

        if ($excludeProgramId) {
            $hasBookingConflict->where('program_id', '!=', $excludeProgramId);
        }

        if ($hasBookingConflict->exists()) {
            return response()->json(['conflict' => true, 'message' => 'The teacher already has an accepted booking at this time.']);
        }

        return response()->json(['conflict' => false]);
    }
}