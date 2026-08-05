<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'amount',
        'payment_date',
        'month',
        'year',
        'payment_type',
        'remarks',
        'commission_gross',
        'commission_vat',
        'commission_percentage',
        'commission_collected_amount',
        'commission_method',
        'commission_basis',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function feeAllocations()
    {
        return $this->hasMany(SalaryPaymentStudentFee::class);
    }
}
