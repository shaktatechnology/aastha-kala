<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryPaymentStudentFee extends Model
{
    use HasFactory;

    protected $table = 'salary_payment_student_fees';

    protected $fillable = [
        'salary_payment_id',
        'student_fee_id',
        'student_id',
        'program_id',
        'month_year',
        'gross_commission',
        'net_commission',
    ];

    protected $casts = [
        'gross_commission' => 'float',
        'net_commission'   => 'float',
    ];

    public function salaryPayment()
    {
        return $this->belongsTo(SalaryPayment::class);
    }

    public function studentFee()
    {
        return $this->belongsTo(StudentFee::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }
}
