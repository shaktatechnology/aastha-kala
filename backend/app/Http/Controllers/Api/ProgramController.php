<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Models\Instructor;
use App\Models\InstructorAvailability;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class ProgramController extends Controller
{
    // GET /api/programs
    public function index(Request $request)
    {
        $query = Program::with(['schedules.instructor', 'instructors', 'subPrograms.schedules.instructor'])
            ->whereNull('parent_id')
            ->latest();

        if (!$request->is('api/admin/*')) {
            $query->where('is_active', true);
            $programs = $query->get();
        } else {
            $programs = $query->paginate(10);
        }

        return response()->json([
            'success' => true,
            'data' => $programs
        ]);
    }

    // GET /api/programs/latest
    public function latest()
    {
        $programs = Program::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $programs
        ]);
    }

    // POST /api/programs
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title'                     => 'required|string|max:255',
            'description'               => 'nullable|string',
            'image'                     => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'speciality'                => 'nullable|array',
            'speciality.*'              => 'string|max:255',
            'is_active'                 => 'nullable|boolean',
            'program_fee'               => 'nullable|numeric|min:0',
            'instructor_ids'            => 'nullable|array',
            'instructor_ids.*'          => 'exists:instructors,id',
            'schedules'                 => 'nullable|array',
            'schedules.*.instructor_id' => 'nullable|exists:instructors,id',
            'schedules.*.start_time'    => 'required_with:schedules|date_format:H:i',
            'schedules.*.end_time'      => 'required_with:schedules|date_format:H:i',
            'sub_programs'              => 'nullable|array',
            'sub_programs.*.title'       => 'required_with:sub_programs|string|max:255',
            'sub_programs.*.description' => 'nullable|string',
            'sub_programs.*.program_fee' => 'nullable|numeric|min:0',
            'sub_programs.*.image'       => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'sub_programs.*.schedules'   => 'nullable|array',
        ]);

        $validator->after(function ($validator) use ($request) {
            $schedules = $request->input('schedules', []);
            $subPrograms = $request->input('sub_programs', []);
            $allSlots = [];
            
            if (empty($subPrograms)) {
                foreach ($schedules as $index => $s) {
                    if (!empty($s['instructor_id']) && !empty($s['start_time']) && !empty($s['end_time'])) {
                        $allSlots[] = ['instructor_id' => $s['instructor_id'], 'start_time' => $s['start_time'], 'end_time' => $s['end_time'], 'key' => "schedules.{$index}.instructor_id"];
                    }
                }
            }
            
            foreach ($subPrograms as $spIndex => $sp) {
                $spSchedules = $sp['schedules'] ?? [];
                foreach ($spSchedules as $sIndex => $s) {
                    if (!empty($s['instructor_id']) && !empty($s['start_time']) && !empty($s['end_time'])) {
                        $allSlots[] = ['instructor_id' => $s['instructor_id'], 'start_time' => $s['start_time'], 'end_time' => $s['end_time'], 'key' => "sub_programs.{$spIndex}.schedules.{$sIndex}.instructor_id"];
                    }
                }
            }
            foreach ($allSlots as $i => $slot1) {
                foreach ($allSlots as $j => $slot2) {
                    if ($i === $j) continue;
                    if ($slot1['instructor_id'] == $slot2['instructor_id']) {
                        if ($slot1['start_time'] < $slot2['end_time'] && $slot1['end_time'] > $slot2['start_time']) {
                            $validator->errors()->add($slot1['key'], 'Instructor assigned to overlapping slot in this form.');
                        }
                    }
                }
            }
        });

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['title', 'description', 'speciality', 'is_active', 'program_fee']);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('programs', 'public');
            $data['image'] = asset('storage/' . $path);
        }

        $program = Program::create($data);

        // Attach instructors if any
        if ($request->has('instructor_ids')) {
            $program->instructors()->sync($request->instructor_ids);
        }

        // Create schedules if provided
        if ($request->has('schedules')) {
            foreach ($request->schedules as $schedule) {
                $program->schedules()->create([
                    'instructor_id' => $schedule['instructor_id'] ?? null,
                    'start_time'    => $schedule['start_time'],
                    'end_time'      => $schedule['end_time'],
                ]);
            }
        }

        // Create sub-programs if provided
        if ($request->has('sub_programs')) {
            foreach ($request->sub_programs as $index => $subData) {
                $subProgramData = [
                    'title'       => $subData['title'],
                    'description' => $subData['description'] ?? null,
                    'program_fee' => $subData['program_fee'] ?? 0,
                    'is_active'   => true,
                ];

                if ($request->hasFile("sub_programs.{$index}.image")) {
                    $path = $request->file("sub_programs.{$index}.image")->store('programs', 'public');
                    $subProgramData['image'] = asset('storage/' . $path);
                }

                $subProgram = $program->subPrograms()->create($subProgramData);

                if (!empty($subData['schedules'])) {
                    foreach ($subData['schedules'] as $sData) {
                        $subProgram->schedules()->create([
                            'instructor_id' => $sData['instructor_id'] ?? null,
                            'start_time'    => $sData['start_time'],
                            'end_time'      => $sData['end_time'],
                        ]);
                    }
                }
            }
        }

        $program->load(['schedules.instructor', 'instructors', 'subPrograms.schedules.instructor']);

        return response()->json([
            'success' => true,
            'message' => 'Program created successfully',
            'data' => $program
        ], 201);
    }

    // GET /api/programs/{id}
    public function show($id)
    {
        $program = Program::with(['schedules.instructor', 'instructors', 'subPrograms.schedules.instructor'])->find($id);

        if (!$program) {
            return response()->json([
                'success' => false,
                'message' => 'Program not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $program
        ]);
    }

    // PUT/PATCH /api/programs/{id}
    public function update(Request $request, $id)
    {
        $program = Program::find($id);

        if (!$program) {
            return response()->json([
                'success' => false,
                'message' => 'Program not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title'                     => 'required|string|max:255',
            'description'               => 'nullable|string',
            'image'                     => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'remove_image'              => 'nullable|in:1',
            'speciality'                => 'nullable|array',
            'speciality.*'              => 'string|max:255',
            'is_active'                 => 'nullable|boolean',
            'program_fee'               => 'nullable|numeric|min:0',
            'instructor_ids'            => 'nullable|array',
            'instructor_ids.*'          => 'exists:instructors,id',
            'schedules'                 => 'nullable|array',
            'schedules.*.instructor_id' => 'nullable|exists:instructors,id',
            'schedules.*.start_time'    => 'required_with:schedules|date_format:H:i',
            'schedules.*.end_time'      => 'required_with:schedules|date_format:H:i',
            'sub_programs'              => 'nullable|array',
            'sub_programs.*.title'       => 'required_with:sub_programs|string|max:255',
            'sub_programs.*.description' => 'nullable|string',
            'sub_programs.*.program_fee' => 'nullable|numeric|min:0',
            'sub_programs.*.image'       => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'sub_programs.*.remove_image'=> 'nullable|in:1',
            'sub_programs.*.schedules'   => 'nullable|array',
        ]);

        $validator->after(function ($validator) use ($request) {
            $schedules = $request->input('schedules', []);
            $subPrograms = $request->input('sub_programs', []);
            $allSlots = [];
            
            // Only collect main schedules if there are no sub-programs
            // If sub-programs exist, main schedules are auto-calculated mirrors
            if (empty($subPrograms)) {
                foreach ($schedules as $index => $s) {
                    if (!empty($s['instructor_id']) && !empty($s['start_time']) && !empty($s['end_time'])) {
                        $allSlots[] = ['instructor_id' => $s['instructor_id'], 'start_time' => $s['start_time'], 'end_time' => $s['end_time'], 'key' => "schedules.{$index}.instructor_id"];
                    }
                }
            }
            
            foreach ($subPrograms as $spIndex => $sp) {
                $spSchedules = $sp['schedules'] ?? [];
                foreach ($spSchedules as $sIndex => $s) {
                    if (!empty($s['instructor_id']) && !empty($s['start_time']) && !empty($s['end_time'])) {
                        $allSlots[] = ['instructor_id' => $s['instructor_id'], 'start_time' => $s['start_time'], 'end_time' => $s['end_time'], 'key' => "sub_programs.{$spIndex}.schedules.{$sIndex}.instructor_id"];
                    }
                }
            }
            foreach ($allSlots as $i => $slot1) {
                foreach ($allSlots as $j => $slot2) {
                    if ($i === $j) continue;
                    if ($slot1['instructor_id'] == $slot2['instructor_id']) {
                        if ($slot1['start_time'] < $slot2['end_time'] && $slot1['end_time'] > $slot2['start_time']) {
                            $validator->errors()->add($slot1['key'], 'Instructor assigned to overlapping slot in this form.');
                        }
                    }
                }
            }
        });

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['title', 'description', 'speciality', 'is_active', 'program_fee']);

        // Handle image removal
        if ($request->has('remove_image') && $request->remove_image == '1' && $program->image) {
            $oldPath = str_replace(asset('storage/'), '', $program->image);
            Storage::disk('public')->delete($oldPath);
            $data['image'] = null;
        }

        // Handle image replacement
        if ($request->hasFile('image')) {
            if ($program->image) {
                $oldPath = str_replace(asset('storage/'), '', $program->image);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('programs', 'public');
            $data['image'] = asset('storage/' . $path);
        }

        $program->update($data);

        // Sync instructors
        if ($request->has('instructor_ids')) {
            $program->instructors()->sync($request->instructor_ids);
        }

        // Update schedules gracefully
        if ($request->has('schedules')) {
            $newSchedules = is_array($request->schedules) ? $request->schedules : [];
            $existingIds = collect($newSchedules)->pluck('id')->filter()->toArray();
            
            // Delete schedules that are no longer present
            $program->schedules()->whereNotIn('id', $existingIds)->delete();
            
            foreach ($newSchedules as $sData) {
                if (!empty($sData['id'])) {
                    $program->schedules()->where('id', $sData['id'])->update([
                        'instructor_id' => $sData['instructor_id'] ?? null,
                        'start_time'    => $sData['start_time'],
                        'end_time'      => $sData['end_time'],
                    ]);
                } else {
                    $program->schedules()->create([
                        'instructor_id' => $sData['instructor_id'] ?? null,
                        'start_time'    => $sData['start_time'],
                        'end_time'      => $sData['end_time'],
                    ]);
                }
            }
        }

        // Update sub-programs gracefully
        if ($request->has('sub_programs')) {
            $newSubPrograms = is_array($request->sub_programs) ? $request->sub_programs : [];
            $existingSubIds = collect($newSubPrograms)->pluck('id')->filter()->toArray();

            // Delete sub-programs that are no longer present
            $program->subPrograms()->whereNotIn('id', $existingSubIds)->delete();

            foreach ($newSubPrograms as $spIndex => $subData) {
                if (!empty($subData['id'])) {
                    $subProgram = $program->subPrograms()->where('id', $subData['id'])->first();
                    if ($subProgram) {
                        $updateData = [
                            'title'       => $subData['title'],
                            'description' => $subData['description'] ?? null,
                            'program_fee' => $subData['program_fee'] ?? 0,
                        ];

                        if (isset($subData['remove_image']) && $subData['remove_image'] == '1' && $subProgram->image) {
                            $oldPath = str_replace(asset('storage/'), '', $subProgram->image);
                            Storage::disk('public')->delete($oldPath);
                            $updateData['image'] = null;
                        }

                        if ($request->hasFile("sub_programs.{$spIndex}.image")) {
                            if ($subProgram->image) {
                                $oldPath = str_replace(asset('storage/'), '', $subProgram->image);
                                Storage::disk('public')->delete($oldPath);
                            }
                            $path = $request->file("sub_programs.{$spIndex}.image")->store('programs', 'public');
                            $updateData['image'] = asset('storage/' . $path);
                        }

                        $subProgram->update($updateData);

                        // Update sub-program schedules
                        if (isset($subData['schedules'])) {
                            $subSchedules = $subData['schedules'];
                            $existingSubSchedulesIds = collect($subSchedules)->pluck('id')->filter()->toArray();
                            $subProgram->schedules()->whereNotIn('id', $existingSubSchedulesIds)->delete();

                            foreach ($subSchedules as $ssData) {
                                if (!empty($ssData['id'])) {
                                    $subProgram->schedules()->where('id', $ssData['id'])->update([
                                        'instructor_id' => $ssData['instructor_id'] ?? null,
                                        'start_time'    => $ssData['start_time'],
                                        'end_time'      => $ssData['end_time'],
                                    ]);
                                } else {
                                    $subProgram->schedules()->create([
                                        'instructor_id' => $ssData['instructor_id'] ?? null,
                                        'start_time'    => $ssData['start_time'],
                                        'end_time'      => $ssData['end_time'],
                                    ]);
                                }
                            }
                        }
                    }
                } else {
                    $subProgramData = [
                        'title'       => $subData['title'],
                        'description' => $subData['description'] ?? null,
                        'program_fee' => $subData['program_fee'] ?? 0,
                        'is_active'   => true,
                    ];

                    if ($request->hasFile("sub_programs.{$spIndex}.image")) {
                        $path = $request->file("sub_programs.{$spIndex}.image")->store('programs', 'public');
                        $subProgramData['image'] = asset('storage/' . $path);
                    }

                    $subProgram = $program->subPrograms()->create($subProgramData);

                    if (!empty($subData['schedules'])) {
                        foreach ($subData['schedules'] as $ssData) {
                            $subProgram->schedules()->create([
                                'instructor_id' => $ssData['instructor_id'] ?? null,
                                'start_time'    => $ssData['start_time'],
                                'end_time'      => $ssData['end_time'],
                            ]);
                        }
                    }
                }
            }
        }

        $program->load(['schedules.instructor', 'instructors', 'subPrograms.schedules.instructor']);

        return response()->json([
            'success' => true,
            'message' => 'Program updated successfully',
            'data' => $program
        ]);
    }

    // DELETE /api/programs/{id}
    public function destroy($id)
    {
        $program = Program::find($id);

        if (!$program) {
            return response()->json([
                'success' => false,
                'message' => 'Program not found'
            ], 404);
        }

        // Delete image
        if ($program->image) {
            $oldPath = str_replace(asset('storage/'), '', $program->image);
            Storage::disk('public')->delete($oldPath);
        }

        $program->delete();

        return response()->json([
            'success' => true,
            'message' => 'Program deleted successfully'
        ]);
    }

    // GET /api/programs/{id}/available-instructors?day_of_week=Monday&start_time=09:00&end_time=10:00&booking_date=2026-03-26
    public function availableInstructors(Request $request, $id)
    {
        $program = Program::find($id);
        if (!$program) {
            return response()->json(['success' => false, 'message' => 'Program not found'], 404);
        }

        $dayOfWeek = $request->day_of_week; // e.g. "Monday"
        $startTime = $request->start_time; // e.g. "09:00"
        $endTime = $request->end_time; // e.g. "10:00"
        $bookingDate = $request->booking_date; // e.g. "2026-03-26" (for conflict check)

        // Step 1: get instructor IDs linked to this program
        $linkedInstructorIds = $program->instructors()->pluck('instructors.id');

        if ($linkedInstructorIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => [], 'message' => 'No instructors assigned to this program']);
        }

        // Step 2: filter to those whose availability covers the requested day+time
        $availableInstructorIds = InstructorAvailability::whereIn('instructor_id', $linkedInstructorIds)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_available', true)
            ->where('start_time', '<=', $startTime)
            ->where('end_time', '>=', $endTime)
            ->pluck('instructor_id');

        // Step 3: exclude any instructor who already has an accepted booking on this date at an overlapping time
        if ($bookingDate && $availableInstructorIds->isNotEmpty()) {
            $conflictedIds = Booking::whereIn('instructor_id', $availableInstructorIds)
                ->where('booking_date', $bookingDate)
                ->where('status', 'accepted')
                ->where(function ($q) use ($startTime, $endTime) {
                $q->whereRaw('custom_start_time < ?', [$endTime])
                    ->whereRaw('custom_end_time > ?', [$startTime]);
            })
                ->pluck('instructor_id');

            $availableInstructorIds = $availableInstructorIds->diff($conflictedIds)->values();
        }

        $instructors = Instructor::whereIn('id', $availableInstructorIds)
            ->select('id', 'name', 'title', 'image')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $instructors,
        ]);
    }
}