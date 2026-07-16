<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentProgram extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'program_id',
        'enrolled_at',
        'status',
        'booking_id',
        'custom_fee',
        'commission_percentage',
        'billing_mode',
        'monthly_discount',
        'monthly_discount_type',
    ];

    protected $casts = [
        'enrolled_at' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get all fee records for this enrollment.
     */
    public function fees()
    {
        return StudentFee::where('student_id', $this->student_id)
            ->where('program_id', $this->program_id)
            ->where('fee_type', 'program');
    }
}
