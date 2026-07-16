<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'roll_no',
        'image',
        'dob',
        'address',
        'phone',
        'email',
        'time',
        'offer_enroll_reference',
        'gender',
        'classes',
        'enrollment_date',
        'duration_value',
        'duration_unit',
        'status',
    ];

    protected $casts = [
        'dob' => 'date',
        'enrollment_date' => 'date',
    ];

    protected $appends = ['image_url', 'shift'];

    public function getShiftAttribute()
    {
        $shifts = [];
        if ($this->relationLoaded('enrollments')) {
            foreach ($this->enrollments as $enrollment) {
                if ($enrollment->status !== 'active') {
                    continue;
                }
                $booking = $enrollment->booking;
                if ($booking) {
                    if ($booking->type === 'customization') {
                        if ($booking->custom_start_time && $booking->custom_end_time) {
                            $startTime = substr($booking->custom_start_time, 0, 5);
                            $endTime = substr($booking->custom_end_time, 0, 5);
                            $shifts[] = "{$startTime} - {$endTime}";
                        }
                    } else {
                        if ($booking->relationLoaded('schedules') && $booking->schedules) {
                            foreach ($booking->schedules as $s) {
                                if ($s->start_time && $s->end_time) {
                                    $startTime = substr($s->start_time, 0, 5);
                                    $endTime = substr($s->end_time, 0, 5);
                                    $shifts[] = "{$startTime} - {$endTime}";
                                }
                            }
                        }
                        if ($booking->relationLoaded('schedule') && $booking->schedule) {
                            $s = $booking->schedule;
                            if ($s->start_time && $s->end_time) {
                                    $startTime = substr($s->start_time, 0, 5);
                                    $endTime = substr($s->end_time, 0, 5);
                                    $shifts[] = "{$startTime} - {$endTime}";
                            }
                        }
                    }
                }
            }
        }
        return !empty($shifts) ? implode(', ', array_unique($shifts)) : null;
    }

    public function getImageUrlAttribute()
    {
        return $this->image ? asset('storage/' . $this->image) : null;
    }

    public function fees()
    {
        return $this->hasMany(StudentFee::class);
    }

    public function enrollments()
    {
        return $this->hasMany(StudentProgram::class);
    }

    public function programs()
    {
        return $this->belongsToMany(Program::class, 'student_programs')
                    ->withPivot(['enrolled_at', 'status'])
                    ->withTimestamps();
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
