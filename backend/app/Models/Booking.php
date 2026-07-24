<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'program_id',
        'schedule_id',
        'instructor_id',
        'booking_date',
        'name',
        'phone',
        'email',
        'address',
        'message',
        'class_mode',
        'type',
        'custom_start_time',
        'custom_end_time',
        'duration_value',
        'duration_unit',
        'status',
        'student_id',
    ];

    protected $casts = [
        'custom_start_time' => 'string',
        'custom_end_time' => 'string',
    ];

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function schedule()
    {
        return $this->belongsTo(ProgramSchedule::class);
    }

    public function instructor()
    {
        return $this->belongsTo(Instructor::class);
    }

    public function schedules()
    {
        return $this->belongsToMany(ProgramSchedule::class, 'booking_schedule', 'booking_id', 'program_schedule_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Check whether saving this booking would create a time-slot conflict
     * for the assigned instructor against any other currently ACCEPTED booking.
     *
     * Pass the Booking instance AFTER setting instructor_id, type, schedule(s),
     * and custom times — but BEFORE calling save()/create().
     *
     * @param  Booking   $booking      The booking to check (may or may not be persisted yet)
     * @param  int|null  $excludeId    Optional booking ID to exclude from the check (e.g. self when updating)
     * @return bool  true if a conflict exists, false if the slot is free
     */
    public static function hasInstructorConflict(self $booking, ?int $excludeId = null): bool
    {
        if (!$booking->instructor_id) {
            return false;
        }

        // Build the list of time slots this booking occupies
        $slots = [];

        if ($booking->type === 'customization' && $booking->custom_start_time && $booking->custom_end_time) {
            $slots[] = [
                'start' => substr($booking->custom_start_time, 0, 5),
                'end'   => substr($booking->custom_end_time,   0, 5),
            ];
        } else {
            // Load relations if not already loaded
            if (!$booking->relationLoaded('schedules')) {
                $booking->loadMissing(['schedules', 'schedule']);
            }
            $schedules = $booking->schedules && $booking->schedules->isNotEmpty()
                ? $booking->schedules
                : collect([$booking->schedule])->filter();

            foreach ($schedules as $s) {
                $slots[] = [
                    'start' => substr($s->start_time, 0, 5),
                    'end'   => substr($s->end_time,   0, 5),
                ];
            }
        }

        if (empty($slots)) {
            return false; // No time info — cannot determine conflict
        }

        foreach ($slots as $slot) {
            $query = static::where('instructor_id', $booking->instructor_id)
                ->where('status', 'accepted')
                ->where(function ($q) use ($slot) {
                    // Regular schedules via pivot
                    $q->whereHas('schedules', function ($sq) use ($slot) {
                        $sq->whereRaw('TIME(start_time) < TIME(?)', [$slot['end']])
                           ->whereRaw('TIME(end_time)   > TIME(?)', [$slot['start']]);
                    })
                    // Regular schedules via single relation
                    ->orWhereHas('schedule', function ($sq) use ($slot) {
                        $sq->whereRaw('TIME(start_time) < TIME(?)', [$slot['end']])
                           ->whereRaw('TIME(end_time)   > TIME(?)', [$slot['start']]);
                    })
                    // Custom time bookings
                    ->orWhere(function ($sq) use ($slot) {
                        $sq->whereNotNull('custom_start_time')
                           ->whereRaw('TIME(custom_start_time) < TIME(?)', [$slot['end']])
                           ->whereRaw('TIME(custom_end_time)   > TIME(?)', [$slot['start']]);
                    });
                });

            // Exclude self (for updates)
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            } elseif ($booking->id) {
                $query->where('id', '!=', $booking->id);
            }

            if ($query->exists()) {
                return true;
            }
        }

        return false;
    }
}
