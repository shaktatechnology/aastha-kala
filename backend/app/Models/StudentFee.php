<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'program_id',
        'fee_type',
        'month_year',
        'total_amount',
        'paid_amount',
        'last_payment_amount',
        'pending_amount',
        'return_amount',
        'status',
        'payment_method',
        'remarks',
        'admission_fee',
        'admission_discount',
        'admission_discount_type',
        'admission_paid',
        'program_fee',
        'program_discount',
        'program_discount_type',
    ];

    protected $casts = [
        'admission_paid' => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function commissionAllocations()
    {
        return $this->hasMany(SalaryPaymentStudentFee::class);
    }
}
